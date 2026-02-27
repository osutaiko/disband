#include "internal.h"

#include <algorithm>
#include <cmath>
#include <limits>

namespace disband::session::note_extractor
{
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
    int pitchChangeFrames = 0;
    int pitchChangeStartSample = 0;
    int framesSinceLastSplit = std::numeric_limits<int>::max();
    bool dipTrackingActive = false;
    double dipLevelDb = 0.0;
    int dipAgeFrames = 0;
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
        pitchChangeFrames = 0;
        pitchChangeStartSample = 0;
        framesSinceLastSplit = std::numeric_limits<int>::max();
        dipTrackingActive = false;
        dipLevelDb = 0.0;
        dipAgeFrames = 0;
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
        const auto confidence = static_cast<double>(aubio_pitch_get_confidence(context.pitch));
        const bool hasPitch = std::isfinite(hz)
            && hz >= settings.pitchMinHz
            && hz <= settings.pitchMaxHz
            && confidence >= settings.minPitchConfidence;

        if (!inNote)
        {
            if (onsetDetected || !isSilent)
            {
                inNote = true;
                noteStartSample = frameStart;
                lowEnergyFrames = 0;
                pitchChangeFrames = 0;
                pitchChangeStartSample = 0;
                framesSinceLastSplit = 0;
                dipTrackingActive = false;
                dipLevelDb = 0.0;
                dipAgeFrames = 0;
                previousLevelDb = levelDb;
                if (hasPitch)
                {
                    const auto weight = std::max(confidence, 0.05);
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
            dipTrackingActive = false;
            dipAgeFrames = 0;
        }
        else
        {
            lowEnergyFrames = 0;
            ++framesSinceLastSplit;

            // Detect a short dip->rise envelope pattern even while pitch stays stable
            bool reAttackDetected = false;
            if (hasPitch && totalWeight > 0.0)
            {
                const auto noteHz = weightedHz / totalWeight;
                const auto midiDelta = std::abs(frequencyToMidi(hz) - frequencyToMidi(noteHz));
                const bool pitchStable = midiDelta <= 0.6;
                if (pitchStable)
                {
                    if (levelDb <= previousLevelDb - 1.2)
                    {
                        if (!dipTrackingActive)
                        {
                            dipTrackingActive = true;
                            dipLevelDb = levelDb;
                            dipAgeFrames = 0;
                        }
                        else
                        {
                            dipLevelDb = std::min(dipLevelDb, levelDb);
                            ++dipAgeFrames;
                        }
                    }
                    else if (dipTrackingActive)
                    {
                        ++dipAgeFrames;
                        dipLevelDb = std::min(dipLevelDb, levelDb);
                        if (dipAgeFrames <= 6 && levelDb - dipLevelDb >= 3.8)
                        {
                            reAttackDetected = true;
                        }
                        else if (dipAgeFrames > 8)
                        {
                            dipTrackingActive = false;
                            dipAgeFrames = 0;
                        }
                    }
                }
                else
                {
                    dipTrackingActive = false;
                    dipAgeFrames = 0;
                }
            }
            else
            {
                dipTrackingActive = false;
                dipAgeFrames = 0;
            }

            if (hasPitch && totalWeight > 0.0)
            {
                const auto noteHz = weightedHz / totalWeight;
                const auto midiDelta = std::abs(frequencyToMidi(hz) - frequencyToMidi(noteHz));
                if (midiDelta >= 0.9)
                {
                    if (pitchChangeFrames == 0)
                        pitchChangeStartSample = frameStart;
                    ++pitchChangeFrames;
                }
                else
                {
                    pitchChangeFrames = 0;
                    pitchChangeStartSample = 0;
                }
            }
            else
            {
                pitchChangeFrames = 0;
                pitchChangeStartSample = 0;
            }

            const bool pitchTransitionDetected = pitchChangeFrames >= 2;
            const int minSplitFrames = std::max(1, static_cast<int>(std::round(25.0 / settings.hopSizeMs)));
            const bool canSplitNow = framesSinceLastSplit >= minSplitFrames;
            if (canSplitNow && (onsetDetected || pitchTransitionDetected || reAttackDetected))
            {
                // Split legato/re-articulated notes while sustaining
                int splitSample = frameStart;
                if (pitchTransitionDetected)
                    splitSample = pitchChangeStartSample;
                flushCurrentNote(splitSample);
                inNote = true;
                noteStartSample = splitSample;
                lowEnergyFrames = 0;
                pitchChangeFrames = 0;
                pitchChangeStartSample = 0;
                framesSinceLastSplit = 0;
                dipTrackingActive = false;
                dipAgeFrames = 0;
                previousLevelDb = levelDb;
                if (hasPitch)
                {
                    const auto weight = std::max(confidence, 0.05);
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
                const auto weight = std::max(confidence, 0.05);
                weightedHz += hz * weight;
                totalWeight += weight;
                confidenceSum += confidence;
                ++confidentFrames;
            }
            previousLevelDb = levelDb;
        }

        if (lowEnergyFrames >= 2)
            flushCurrentNote(frameStart);
    }

    flushCurrentNote(workingBuffer.getNumSamples() - 1);

    return notes;
}
} // namespace disband::session::note_extractor
