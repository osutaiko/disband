#include <juce_audio_devices/juce_audio_devices.h>
#include <juce_audio_formats/juce_audio_formats.h>
#include <juce_gui_basics/juce_gui_basics.h>
#include <juce_core/juce_core.h>

#include <cstdio>
#include <string>
#include <thread>

class DisbandAudioRecorder : public juce::AudioIODeviceCallback
{
public:
    DisbandAudioRecorder() : writerThread("DisbandAudioWriter")
    {
        writerThread.startThread();
    }

    ~DisbandAudioRecorder() override
    {
        stopRecording();
        writerThread.stopThread(1000);
    }

    bool startRecording(const juce::File& file)
    {
        stopRecording();
        file.getParentDirectory().createDirectory();

        auto stream = file.createOutputStream();
        if (!stream || !stream->openedOk())
            return false;

        juce::WavAudioFormat format;
        auto* writer = format.createWriterFor(
            stream.release(),
            sampleRate,
            channels,
            bitsPerSample,
            {},
            0
        );

        if (writer == nullptr)
            return false;

        auto newThreadedWriter = std::make_unique<juce::AudioFormatWriter::ThreadedWriter>(
            writer,
            writerThread,
            static_cast<int>(sampleRate)
        );

        {
            const juce::ScopedLock lock(writerLock);
            threadedWriter = std::move(newThreadedWriter);
            activeWriter = threadedWriter.get();
        }

        return true;
    }

    void stopRecording()
    {
        const juce::ScopedLock lock(writerLock);
        activeWriter = nullptr;
        threadedWriter.reset();
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

        monoBuffer.setSize(1, numSamples, false, false, true);
        monoBuffer.clear();

        int contributingChannels = 0;
        for (int ch = 0; ch < numInputChannels; ++ch)
        {
            if (inputChannelData[ch] == nullptr) continue;
            monoBuffer.addFrom(0, 0, inputChannelData[ch], numSamples);
            ++contributingChannels;
        }

        if (contributingChannels > 1)
            monoBuffer.applyGain(0, 0, numSamples, 1.0f / static_cast<float>(contributingChannels));

        const juce::ScopedTryLock lock(writerLock);
        if (lock.isLocked() && activeWriter != nullptr)
        {
            const float* channelsPtr[1] = { monoBuffer.getReadPointer(0) };
            activeWriter->write(channelsPtr, numSamples);
        }
    }

    void audioDeviceAboutToStart(juce::AudioIODevice* /*device*/) override {}
    void audioDeviceStopped() override {}

private:
    static constexpr double sampleRate = 48000.0;
    static constexpr unsigned int channels = 1;
    static constexpr int bitsPerSample = 16;

    juce::AudioBuffer<float> monoBuffer;
    juce::TimeSliceThread writerThread;
    juce::CriticalSection writerLock;
    std::unique_ptr<juce::AudioFormatWriter::ThreadedWriter> threadedWriter;
    juce::AudioFormatWriter::ThreadedWriter* activeWriter = nullptr;

};

class AudioCaptureApp final : public juce::JUCEApplication
{
public:
    AudioCaptureApp() = default;

    const juce::String getApplicationName() override { return "Disband Audio Capture"; }
    const juce::String getApplicationVersion() override { return "0.1.0"; }

    void initialise(const juce::String&) override
    {
        outputPath = resolveOutputPath();
        if (outputPath.isEmpty())
        {
            std::fprintf(stderr, "[audio-sidecar] missing output path\n");
            std::fflush(stderr);
            quit();
            return;
        }

        if (!recorder.startRecording(juce::File(outputPath)))
        {
            std::fprintf(stderr, "[audio-sidecar] failed to open output file\n");
            std::fflush(stderr);
            quit();
            return;
        }

        std::fprintf(stderr, "[audio-sidecar] recording output=\"%s\"\n", outputPath.toRawUTF8());
        std::fflush(stderr);

        const auto initResult = deviceManager.initialise(1, 0, nullptr, true);
        if (initResult.isNotEmpty())
        {
            std::fprintf(stderr, "[audio-sidecar] device init failed: %s\n", initResult.toRawUTF8());
            std::fflush(stderr);
            quit();
            return;
        }
        configureDevice();

        auto* device = deviceManager.getCurrentAudioDevice();
        if (device == nullptr)
        {
            std::fprintf(stderr, "[audio-sidecar] no audio device available\n");
            std::fflush(stderr);
            quit();
            return;
        }

        controlThread = std::thread([this] { controlLoop(); });
        deviceManager.addAudioCallback(&recorder);
    }

    void shutdown() override
    {
        deviceManager.removeAudioCallback(&recorder);
        deviceManager.closeAudioDevice();

        if (controlThread.joinable())
            controlThread.join();
        recorder.stopRecording();
    }

private:
    juce::String resolveOutputPath() const
    {
        const auto args = juce::JUCEApplication::getInstance()->getCommandLineParameterArray();
        for (int i = 0; i < args.size(); ++i)
        {
            if (args[i] == "--output" && i + 1 < args.size())
                return args[i + 1];
        }
        return {};
    }

    void configureDevice()
    {
        juce::AudioDeviceManager::AudioDeviceSetup setup;
        deviceManager.getAudioDeviceSetup(setup);
        setup.sampleRate = 48000.0;
        setup.bufferSize = 128;
        const auto result = deviceManager.setAudioDeviceSetup(setup, true);
        if (result.isNotEmpty())
        {
            std::fprintf(stderr, "[audio-sidecar] device setup failed: %s\n", result.toRawUTF8());
            std::fflush(stderr);
        }
    }

    void controlLoop()
    {
        std::string line;
        while (std::getline(std::cin, line))
        {
            if (line == "stop")
                break;
        }

        juce::MessageManager::callAsync([] {
            if (auto* app = juce::JUCEApplicationBase::getInstance())
                app->systemRequestedQuit();
        });
    }

    juce::AudioDeviceManager deviceManager;
    DisbandAudioRecorder recorder;
    std::thread controlThread;
    juce::String outputPath;
};

START_JUCE_APPLICATION(AudioCaptureApp)
