// Core note segmentation logic.

#include "internal.h"
#include "../judgment_errors/errors.h"

#include <algorithm>
#include <cmath>
#include <limits>

namespace disband::session::note_extraction
{
namespace
{
constexpr double kMinimumPitchWeight = 0.05;
constexpr double kPitchSplitMidiDelta = 1.2;
constexpr int kPitchSplitFrames = 2;
constexpr double kMinSplitIntervalMs = 25.0;
constexpr int kLowEnergyEndFrames = 2;

std::vector<double> normalizeCycle(std::vector<double> cycle)
{
    if (cycle.empty())
        return cycle;

    double mean = 0.0;
    for (double value : cycle)
        mean += value;
    mean /= static_cast<double>(cycle.size());

    double sumSquares = 0.0;
    for (double value : cycle)
    {
        const double centered = value - mean;
        sumSquares += centered * centered;
    }

    const double rms = std::sqrt(sumSquares / static_cast<double>(std::max<size_t>(1, cycle.size())));
    if (rms <= std::numeric_limits<double>::epsilon())
    {
        std::fill(cycle.begin(), cycle.end(), 0.0);
        return cycle;
    }

    for (double& value : cycle)
        value = (value - mean) / rms;

    return cycle;
}

std::vector<double> computeWaveformProfile(
    const juce::AudioBuffer<float>& workingBuffer,
    int startSample,
    int sampleCount,
    double sampleRate,
    double frequencyHz,
    int cycleCount)
{
    if (workingBuffer.getNumChannels() <= 0 || workingBuffer.getNumSamples() <= 0)
        return {};
    if (startSample < 0 || sampleCount <= 0 || sampleRate <= 0.0 || frequencyHz <= 0.0 || cycleCount <= 0)
        return {};

    const int periodSamples = std::max(1, static_cast<int>(std::lround(sampleRate / frequencyHz)));
    const int endSample = std::min(startSample + sampleCount, workingBuffer.getNumSamples());
    const int availableSamples = endSample - startSample;
    const int availableCycles = availableSamples / periodSamples;
    const int cyclesToUse = std::min(cycleCount, availableCycles);
    if (cyclesToUse <= 0)
        return {};

    const float* samples = workingBuffer.getReadPointer(0);
    std::vector<double> profile(static_cast<size_t>(periodSamples), 0.0);
    for (int cycle = 0; cycle < cyclesToUse; ++cycle)
    {
        const int cycleStart = startSample + (cycle * periodSamples);
        std::vector<double> cycleProfile(static_cast<size_t>(periodSamples), 0.0);
        for (int i = 0; i < periodSamples; ++i)
            cycleProfile[static_cast<size_t>(i)] = static_cast<double>(samples[cycleStart + i]);

        cycleProfile = normalizeCycle(std::move(cycleProfile));
        for (int i = 0; i < periodSamples; ++i)
            profile[static_cast<size_t>(i)] += cycleProfile[static_cast<size_t>(i)];
    }

    for (double& value : profile)
        value /= static_cast<double>(cyclesToUse);

    return profile;
}
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
    const int onsetCompensationSamples = std::max(
        0,
        static_cast<int>(std::lround(settings.onsetCompensationMs * sampleRate / 1000.0)));

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

    auto startNoteAt = [&](
        int startSample,
        double currentLevelDb,
        bool currentHasPitch,
        double currentHz,
        double currentConfidence)
    {
        inNote = true;
        noteStartSample = startSample;
        lowEnergyFrames = 0;
        pitchSplitFrames = 0;
        framesSinceLastSplit = 0;
        previousLevelDb = currentLevelDb;
        
        if (currentHasPitch)
        {
            const auto weight = std::max(currentConfidence, kMinimumPitchWeight);
            weightedHz = currentHz * weight;
            totalWeight = weight;
            confidenceSum = currentConfidence;
            confidentFrames = 1;
        }
        else
        {
            weightedHz = 0.0;
            totalWeight = 0.0;
            confidenceSum = 0.0;
            confidentFrames = 0;
        }
    };

    auto flushCurrentNote = [&](int noteEndSample) {
        if (!inNote)
            return;

        const auto startMs = static_cast<double>(noteStartSample) * 1000.0 / sampleRate;
        const auto endMs = static_cast<double>(noteEndSample) * 1000.0 / sampleRate;
        const auto durationMs = endMs - startMs;

        if (durationMs >= settings.minNoteMs)
        {
            const int noteSamples = std::max(1, noteEndSample - noteStartSample);
            const int velocityWindowSamples = std::max(
                1,
                static_cast<int>(std::lround(settings.velocityAnalysisWindowMs * sampleRate / 1000.0)));
            const int velocitySampleCount = std::min(noteSamples, velocityWindowSamples);
            const auto windowAnalysis =
                computeNoteWindowFeatures(workingBuffer, noteStartSample, velocitySampleCount);
            const auto hz = totalWeight > 0.0 ? (weightedHz / totalWeight) : 0.0;
            const int midiRounded = hz > 0.0
                ? static_cast<int>(std::lround(frequencyToMidi(hz)))
                : -1;
            const auto waveformProfile = computeWaveformProfile(
                workingBuffer,
                noteStartSample,
                velocitySampleCount,
                sampleRate,
                hz,
                settings.waveformProfileCycleCount);

            notes.push_back({
                startMs,
                endMs,
                hz,
                midiRounded,
                confidenceSum / static_cast<double>(std::max(1, confidentFrames)),
                windowAnalysis.velocityRms,
                std::move(waveformProfile)
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
                const int detectedSample = static_cast<int>(aubio_onset_get_last(context.onset));
                const int startSample = (onsetDetected && detectedSample >= 0 && detectedSample <= frameStart + hopSize)
                    ? std::max(0, detectedSample - onsetCompensationSamples)
                    : frameStart;
                startNoteAt(startSample, levelDb, hasPitch, hz, confidence);
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
                const int detectedSample = static_cast<int>(aubio_onset_get_last(context.onset));
                const int splitSample = (onsetDetected && detectedSample >= 0 && detectedSample <= frameStart + hopSize)
                    ? std::max(0, detectedSample - onsetCompensationSamples)
                    : frameStart;
                flushCurrentNote(splitSample);
                startNoteAt(splitSample, levelDb, hasPitch, hz, confidence);
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
} // namespace disband::session::note_extraction
