#include <juce_audio_devices/juce_audio_devices.h>
#include <juce_audio_utils/juce_audio_utils.h>
#include <juce_core/juce_core.h>
#include <cstdio>
#if JUCE_WINDOWS
#include <fcntl.h>
#include <io.h>
#endif

class MyAudioCallback : public juce::AudioIODeviceCallback
{
public:
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

            std::fwrite(&mixedSample, sizeof(float), 1, stdout);
        }

        std::fflush(stdout);
    }

    void audioDeviceAboutToStart(juce::AudioIODevice* /*device*/) override {}
    void audioDeviceStopped() override {}
};

// Main JUCE application
class AudioCaptureApp final : public juce::JUCEApplication
{
public:
    const juce::String getApplicationName() override { return "Disband Audio Capture"; }
    const juce::String getApplicationVersion() override { return "0.1.0"; }

    void initialise(const juce::String&) override
    {
#if JUCE_WINDOWS
        _setmode(_fileno(stdout), _O_BINARY);
#endif
        deviceManager.initialise(1, 0, nullptr, true);
        configureDevice();
        deviceManager.addAudioCallback(&callback);
    }

    void shutdown() override
    {
        deviceManager.removeAudioCallback(&callback);
        deviceManager.closeAudioDevice();
    }

private:
    juce::AudioDeviceManager deviceManager;
    MyAudioCallback callback;

    void configureDevice()
    {
        juce::AudioDeviceManager::AudioDeviceSetup setup;
        deviceManager.getAudioDeviceSetup(setup);
        setup.sampleRate = 48000.0;
        setup.bufferSize = 128;
        deviceManager.setAudioDeviceSetup(setup, true);
    }
};

START_JUCE_APPLICATION(AudioCaptureApp)
