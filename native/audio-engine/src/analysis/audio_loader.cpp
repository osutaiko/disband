#include "session.h"

#include <juce_audio_formats/juce_audio_formats.h>

#include <memory>

namespace disband::session
{
bool loadMonoWavFile(
    const juce::File& file,
    juce::AudioBuffer<float>& outMono,
    double& outSampleRate,
    juce::String& outError)
{
    outMono.setSize(1, 0);
    outSampleRate = 0.0;
    outError.clear();

    if (!file.existsAsFile())
    {
        outError = "File does not exist";
        return false;
    }

    juce::AudioFormatManager formatManager;
    formatManager.registerBasicFormats();

    std::unique_ptr<juce::AudioFormatReader> reader(formatManager.createReaderFor(file));
    if (reader == nullptr)
    {
        outError = "Unsupported audio format";
        return false;
    }

    if (reader->lengthInSamples <= 0)
    {
        outError = "Empty audio file";
        return false;
    }

    const auto totalSamples = static_cast<int>(reader->lengthInSamples);
    juce::AudioBuffer<float> tempBuffer(static_cast<int>(reader->numChannels), totalSamples);
    if (!reader->read(&tempBuffer, 0, totalSamples, 0, true, true))
    {
        outError = "Failed to decode audio";
        return false;
    }

    outMono.setSize(1, totalSamples);
    outMono.clear();

    const auto channels = tempBuffer.getNumChannels();
    if (channels <= 0)
    {
        outError = "Audio has no channels";
        return false;
    }

    for (int ch = 0; ch < channels; ++ch)
        outMono.addFrom(0, 0, tempBuffer, ch, 0, totalSamples);

    if (channels > 1)
        outMono.applyGain(0, 0, totalSamples, 1.0f / static_cast<float>(channels));

    outSampleRate = reader->sampleRate;
    return true;
}
} // namespace disband::session
