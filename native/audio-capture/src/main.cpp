#include <juce_audio_devices/juce_audio_devices.h>
#include <juce_audio_utils/juce_audio_utils.h>
#include <juce_core/juce_core.h>

#include <algorithm>
#include <atomic>
#include <chrono>
#include <cmath>
#include <cstdint>
#include <cstdio>
#include <thread>
#include <vector>

#if JUCE_WINDOWS
#include <fcntl.h>
#include <io.h>
#endif

class MyAudioCallback : public juce::AudioIODeviceCallback
{
public:
    explicit MyAudioCallback(int ringCapacitySamples)
        : ringFifo(ringCapacitySamples),
          ringBuffer(static_cast<size_t>(ringCapacitySamples))
    {
    }

    void audioDeviceIOCallbackWithContext(
        const float* const* inputChannelData,
        int numInputChannels,
        float* const* /*outputChannelData*/,
        int /*numOutputChannels*/,
        int numSamples,
        const juce::AudioIODeviceCallbackContext& /*context*/
    ) override
    {
        if (numInputChannels <= 0 || numSamples <= 0) return;

        if (static_cast<int>(sampleScratch.size()) < numSamples)
            sampleScratch.resize(static_cast<size_t>(numSamples));

        float blockPeak = 0.0f;
        double blockEnergy = 0.0;

        for (int i = 0; i < numSamples; ++i)
        {
            float mixedSample = 0.0f;
            int contributingChannels = 0;

            for (int ch = 0; ch < numInputChannels; ++ch)
            {
                if (inputChannelData[ch] == nullptr) continue;
                mixedSample += inputChannelData[ch][i];
                ++contributingChannels;
            }

            if (contributingChannels > 1)
                mixedSample /= static_cast<float>(contributingChannels);

            const float clamped = juce::jlimit(-1.0f, 1.0f, mixedSample);
            blockPeak = std::max(blockPeak, std::abs(clamped));
            blockEnergy += static_cast<double>(clamped) * static_cast<double>(clamped);
            const int sample16 = static_cast<int>(std::lround(clamped * 32767.0f));
            sampleScratch[static_cast<size_t>(i)] = static_cast<int16_t>(sample16);
        }

        pushSamples(sampleScratch.data(), numSamples);

        samplesSinceLog += numSamples;
        sumSquaresSinceLog += blockEnergy;
        peakSinceLog = std::max(peakSinceLog, blockPeak);
        if (samplesSinceLog >= 48000)
        {
            const double rms = std::sqrt(sumSquaresSinceLog / static_cast<double>(samplesSinceLog));
            std::fprintf(
                stderr,
                "[audio-sidecar] level peak=%.6f rms=%.6f samples=%d dropped=%d\n",
                static_cast<double>(peakSinceLog),
                rms,
                samplesSinceLog,
                droppedSamples.exchange(0)
            );
            std::fflush(stderr);

            samplesSinceLog = 0;
            sumSquaresSinceLog = 0.0;
            peakSinceLog = 0.0f;
        }
    }

    void audioDeviceAboutToStart(juce::AudioIODevice* /*device*/) override {}
    void audioDeviceStopped() override {}

    int popSamples(int16_t* dst, int maxSamples)
    {
        if (maxSamples <= 0) return 0;

        int start1 = 0, size1 = 0, start2 = 0, size2 = 0;
        ringFifo.prepareToRead(maxSamples, start1, size1, start2, size2);

        if (size1 > 0)
            std::copy_n(ringBuffer.data() + start1, static_cast<size_t>(size1), dst);
        if (size2 > 0)
            std::copy_n(ringBuffer.data() + start2, static_cast<size_t>(size2), dst + size1);

        const int read = size1 + size2;
        ringFifo.finishedRead(read);
        return read;
    }

private:
    void pushSamples(const int16_t* src, int numSamples)
    {
        int start1 = 0, size1 = 0, start2 = 0, size2 = 0;
        ringFifo.prepareToWrite(numSamples, start1, size1, start2, size2);

        if (size1 > 0)
            std::copy_n(src, static_cast<size_t>(size1), ringBuffer.data() + start1);
        if (size2 > 0)
            std::copy_n(src + size1, static_cast<size_t>(size2), ringBuffer.data() + start2);

        const int written = size1 + size2;
        ringFifo.finishedWrite(written);
        if (written < numSamples)
            droppedSamples += (numSamples - written);
    }

    juce::AbstractFifo ringFifo;
    std::vector<int16_t> ringBuffer;
    std::vector<int16_t> sampleScratch;

    int samplesSinceLog = 0;
    double sumSquaresSinceLog = 0.0;
    float peakSinceLog = 0.0f;
    std::atomic<int> droppedSamples{ 0 };
};

class AudioCaptureApp final : public juce::JUCEApplication
{
public:
    AudioCaptureApp() : callback(48000 * 10) {}

    const juce::String getApplicationName() override { return "Disband Audio Capture"; }
    const juce::String getApplicationVersion() override { return "0.1.0"; }

    void initialise(const juce::String&) override
    {
#if JUCE_WINDOWS
        _setmode(_fileno(stdout), _O_BINARY);
#endif
        std::setvbuf(stdout, nullptr, _IONBF, 0);
        std::fprintf(stderr, "[audio-sidecar] stream=pcm16 sampleRate=48000 channels=1\n");
        std::fflush(stderr);

        deviceManager.initialise(1, 0, nullptr, true);
        configureDevice();

        if (auto* device = deviceManager.getCurrentAudioDevice())
        {
            const auto activeInputs = device->getActiveInputChannels().toString(2);
            std::fprintf(
                stderr,
                "[audio-sidecar] inputDevice=\"%s\" sr=%.1f buffer=%d inMask=%s\n",
                device->getName().toRawUTF8(),
                device->getCurrentSampleRate(),
                device->getCurrentBufferSizeSamples(),
                activeInputs.toRawUTF8()
            );
            std::fflush(stderr);
        }

        keepWriting.store(true);
        writerThread = std::thread([this] { writerLoop(); });
        deviceManager.addAudioCallback(&callback);
    }

    void shutdown() override
    {
        deviceManager.removeAudioCallback(&callback);
        deviceManager.closeAudioDevice();

        keepWriting.store(false);
        if (writerThread.joinable())
            writerThread.join();
    }

private:
    void configureDevice()
    {
        juce::AudioDeviceManager::AudioDeviceSetup setup;
        deviceManager.getAudioDeviceSetup(setup);
        setup.sampleRate = 48000.0;
        setup.bufferSize = 128;
        deviceManager.setAudioDeviceSetup(setup, true);
    }

    void writerLoop()
    {
        std::vector<int16_t> writeScratch(4096);

        while (keepWriting.load())
        {
            const int count = callback.popSamples(writeScratch.data(), static_cast<int>(writeScratch.size()));
            if (count > 0)
            {
                std::fwrite(writeScratch.data(), sizeof(int16_t), static_cast<size_t>(count), stdout);
            }
            else
            {
                std::this_thread::sleep_for(std::chrono::milliseconds(1));
            }
        }

        for (;;)
        {
            const int count = callback.popSamples(writeScratch.data(), static_cast<int>(writeScratch.size()));
            if (count <= 0) break;
            std::fwrite(writeScratch.data(), sizeof(int16_t), static_cast<size_t>(count), stdout);
        }
    }

    juce::AudioDeviceManager deviceManager;
    MyAudioCallback callback;
    std::atomic<bool> keepWriting{ false };
    std::thread writerThread;
};

START_JUCE_APPLICATION(AudioCaptureApp)
