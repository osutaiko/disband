// Core note segmentation logic.

#include "internal.h"

#include <algorithm>
#include <cmath>
#include <limits>

namespace disband::session::note_extractor
{
namespace
{
constexpr double kMinimumPitchWeight = 0.05;
constexpr double kPitchSplitMidiDelta = 1.2;
constexpr int kPitchSplitFrames = 2;
constexpr double kMinSplitIntervalMs = 25.0;
constexpr int kLowEnergyEndFrames = 2;
} // namespace

std::vector<PlayedNote> detectNotes(
    const juce::AudioBuffer<float>& workingBuffer,
    int hopSize,
    double sampleRate,
    const DetectionSettings& settings,
    AubioContext& context)
{
    std::vector<PlayedNote> notes;

    const float* samples = workingBuffer.getReadPointer(0);
    const int maxStart = workingBuffer.getNumSamples() - hopSize;

    bool inNote = false;
    int noteStartSample = 0;
    int lowEnergyFrames = 0;
    int pitchSplitFrames = 0;
    int framesSinceLastSplit = std::numeric_limits<int>::max();
    double previousLevelDb = settings.silenceDb;
    double weightedHz = 0.0;
    double totalWeight = 0.0;
    double confidenceSum = 0.0;
    int confidentFrames = 0;

    auto flushCurrentNote = [&](int noteEndSample) {
        if (!inNote)
            return;

        const auto startMs = static_cast<double>(noteStartSample) * 1000.0 / sampleRate;
        const auto endMs = static_cast<double>(noteEndSample) * 1000.0 / sampleRate;
        const auto durationMs = endMs - startMs;

        if (durationMs >= settings.minNoteMs)
        {
            const auto hz = totalWeight > 0.0 ? (weightedHz / totalWeight) : 0.0;
            const int midiRounded = hz > 0.0
                ? static_cast<int>(std::lround(frequencyToMidi(hz)))
                : -1;

            notes.push_back({
                startMs,
                endMs,
                hz,
                midiRounded,
                confidenceSum / static_cast<double>(std::max(1, confidentFrames))
            });
        }

        inNote = false;
        noteStartSample = 0;
        lowEnergyFrames = 0;
        pitchSplitFrames = 0;
        framesSinceLastSplit = std::numeric_limits<int>::max();
        previousLevelDb = settings.silenceDb;
        weightedHz = 0.0;
        totalWeight = 0.0;
        confidenceSum = 0.0;
        confidentFrames = 0;
    };

    for (int frameStart = 0; frameStart <= maxStart; frameStart += hopSize)
    {
        for (int i = 0; i < hopSize; ++i)
        {
            const int sampleIndex = frameStart + i;
            const float value = sampleIndex < workingBuffer.getNumSamples()
                ? samples[sampleIndex]
                : 0.0f;
            fvec_set_sample(context.pitchInput, static_cast<smpl_t>(value), static_cast<uint_t>(i));
        }

        aubio_onset_do(context.onset, context.pitchInput, context.onsetOutput);
        aubio_pitch_do(context.pitch, context.pitchInput, context.pitchOutput);

        const bool onsetDetected = fvec_get_sample(context.onsetOutput, 0) > 0.0f;
        const auto levelDb = static_cast<double>(aubio_db_spl(context.pitchInput));
        const bool isSilent = !std::isfinite(levelDb) || levelDb <= settings.silenceDb;
        const auto hz = static_cast<double>(fvec_get_sample(context.pitchOutput, 0));
        const auto confidenceRaw = static_cast<double>(aubio_pitch_get_confidence(context.pitch));
        const auto confidence = std::isfinite(confidenceRaw)
            ? std::clamp(confidenceRaw, 0.0, 1.0)
            : 0.0;
        const bool hasPitch = std::isfinite(hz)
            && hz >= settings.pitchMinHz
            && hz <= settings.pitchMaxHz;

        if (!inNote)
        {
            if (onsetDetected || !isSilent)
            {
                inNote = true;
                noteStartSample = frameStart;
                lowEnergyFrames = 0;
                pitchSplitFrames = 0;
                framesSinceLastSplit = 0;
                previousLevelDb = levelDb;
                if (hasPitch)
                {
                    const auto weight = std::max(confidence, kMinimumPitchWeight);
                    weightedHz = hz * weight;
                    totalWeight = weight;
                    confidenceSum = confidence;
                    confidentFrames = 1;
                }
                else
                {
                    weightedHz = 0.0;
                    totalWeight = 0.0;
                    confidenceSum = 0.0;
                    confidentFrames = 0;
                }
            }
            continue;
        }

        if (isSilent)
        {
            ++lowEnergyFrames;
            ++framesSinceLastSplit;
        }
        else
        {
            lowEnergyFrames = 0;
            ++framesSinceLastSplit;
            if (hasPitch && confidence >= settings.minPitchConfidence && totalWeight > 0.0)
            {
                const auto noteHz = weightedHz / totalWeight;
                const auto midiDelta = std::abs(frequencyToMidi(hz) - frequencyToMidi(noteHz));
                if (midiDelta >= kPitchSplitMidiDelta)
                    ++pitchSplitFrames;
                else
                    pitchSplitFrames = 0;
            }
            else
            {
                pitchSplitFrames = 0;
            }

            const int minSplitFrames = std::max(1, static_cast<int>(std::round(kMinSplitIntervalMs / settings.hopSizeMs)));
            const bool canSplitNow = framesSinceLastSplit >= minSplitFrames;
            const bool pitchTransitionDetected = pitchSplitFrames >= kPitchSplitFrames;
            if (canSplitNow && (onsetDetected || pitchTransitionDetected))
            {
                // Split on explicit onsets; use a short, high-threshold pitch jump fallback.
                const int splitSample = frameStart;
                flushCurrentNote(splitSample);
                inNote = true;
                noteStartSample = splitSample;
                lowEnergyFrames = 0;
                pitchSplitFrames = 0;
                framesSinceLastSplit = 0;
                previousLevelDb = levelDb;
                if (hasPitch)
                {
                    const auto weight = std::max(confidence, kMinimumPitchWeight);
                    weightedHz = hz * weight;
                    totalWeight = weight;
                    confidenceSum = confidence;
                    confidentFrames = 1;
                }
                else
                {
                    weightedHz = 0.0;
                    totalWeight = 0.0;
                    confidenceSum = 0.0;
                    confidentFrames = 0;
                }
                continue;
            }
            if (hasPitch)
            {
                const auto weight = std::max(confidence, kMinimumPitchWeight);
                weightedHz += hz * weight;
                totalWeight += weight;
                confidenceSum += confidence;
                ++confidentFrames;
            }
            previousLevelDb = levelDb;
        }

        if (lowEnergyFrames >= kLowEnergyEndFrames)
            flushCurrentNote(frameStart);
    }

    flushCurrentNote(workingBuffer.getNumSamples() - 1);

    return notes;
}
} // namespace disband::session::note_extractor
