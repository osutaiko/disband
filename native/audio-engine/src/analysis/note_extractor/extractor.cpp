#include "internal.h"

#include <algorithm>
#include <cmath>

namespace disband::session
{
std::vector<PlayedNote> extractMonophonicNotes(
    const juce::AudioBuffer<float>& mono,
    double sampleRate,
    const DetectionSettings& settings)
{
    std::vector<PlayedNote> notes;
    if (mono.getNumChannels() <= 0 || mono.getNumSamples() <= 0 || sampleRate <= 0.0)
        return notes;

    juce::AudioBuffer<float> workingBuffer;
    workingBuffer.makeCopyOf(mono);
    note_extractor::normalizeWorkingBuffer(workingBuffer);

    const int hopSize = std::max(1, static_cast<int>(std::round(settings.hopSizeMs * sampleRate / 1000.0)));
    if (hopSize >= workingBuffer.getNumSamples())
        return notes;

    auto context = note_extractor::createAubioContext(hopSize, sampleRate, settings);
    if (context.pitchInput == nullptr || context.pitchOutput == nullptr
        || context.onsetOutput == nullptr || context.pitch == nullptr || context.onset == nullptr)
    {
        return notes;
    }

    notes = note_extractor::detectNotes(workingBuffer, hopSize, sampleRate, settings, context);
    note_extractor::destroyAubioContext(context);
    return notes;
}
} // namespace disband::session
