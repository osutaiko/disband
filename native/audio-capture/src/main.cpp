#include <JuceHeader.h>

class AudioCaptureApp final
  : public juce::JUCEApplication,
    private juce::AudioIODeviceCallback
{
public:
  const juce::String getApplicationName() override { return "Disband Audio Capture"; }
  const juce::String getApplicationVersion() override { return "0.1.0"; }

  void initialise(const juce::String&) override
  {
    deviceManager.initialise(1, 0, nullptr, true);
    configureDevice();
    deviceManager.addAudioCallback(this);
  }

  void shutdown() override
  {
    deviceManager.removeAudioCallback(this);
    deviceManager.closeAudioDevice();
  }

private:
  juce::AudioDeviceManager deviceManager;

  void configureDevice()
  {
    juce::AudioDeviceManager::AudioDeviceSetup setup;
    deviceManager.getAudioDeviceSetup(setup);
    setup.sampleRate = 48000.0;
    setup.bufferSize = 128;
    deviceManager.setAudioDeviceSetup(setup, true);
  }

  void audioDeviceIOCallback(
    const float** input,
    int numChannels,
    float**,
    int,
    int numSamples
  ) override
  {
    if (numChannels <= 0 || numSamples <= 0) return;

    // interleaved float32
    for (int i = 0; i < numSamples; ++i)
    {
      for (int ch = 0; ch < numChannels; ++ch)
      {
        float sample = input[ch] ? input[ch][i] : 0.0f;
        std::fwrite(&sample, sizeof(float), 1, stdout);
      }
    }

    std::fflush(stdout);
  }

  void audioDeviceAboutToStart(juce::AudioIODevice*) override {}
  void audioDeviceStopped() override {}
};

START_JUCE_APPLICATION(AudioCaptureApp)
