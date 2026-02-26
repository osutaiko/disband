#include "session.h"

#include <aubio.h>
#include <juce_audio_formats/juce_audio_formats.h>

#include <algorithm>
#include <cmath>
#include <limits>
#include <memory>
#include <numeric>

namespace disband::session
{
namespace
{
constexpr double kA4Hz = 440.0;

double frequencyToMidi(double hz)
{
    if (hz <= 0.0)
        return -1.0;
    return 69.0 + 12.0 * std::log2(hz / kA4Hz);
}

uint_t nextPowerOfTwo(uint_t value)
{
    if (value <= 2u)
        return 2u;

    --value;
    value |= value >> 1u;
    value |= value >> 2u;
    value |= value >> 4u;
    value |= value >> 8u;
    value |= value >> 16u;
    return value + 1u;
}

} // namespace

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

    // Normalize quiet takes so fixed RMS thresholds still detect attacks.
    // Skip normalization when essentially silent to avoid boosting noise-only files.
    const int totalSamples = workingBuffer.getNumSamples();
    const float* const source = workingBuffer.getReadPointer(0);
    float peakAbs = 0.0f;
    for (int i = 0; i < totalSamples; ++i)
        peakAbs = std::max(peakAbs, std::abs(source[i]));

    if (peakAbs >= 0.0005f && peakAbs < 0.95f)
    {
        const float gain = 0.95f / peakAbs;
        workingBuffer.applyGain(gain);
    }

    const int hopSize = std::max(1, static_cast<int>(std::round(settings.hopSizeMs * sampleRate / 1000.0)));
    if (hopSize >= workingBuffer.getNumSamples())
        return notes;

    const float* samples = workingBuffer.getReadPointer(0);
    const int maxStart = workingBuffer.getNumSamples() - hopSize;

    const auto aubioHopSize = static_cast<uint_t>(hopSize);
    const auto aubioBufferSize = nextPowerOfTwo(std::max<uint_t>(
        aubioHopSize * 4u,
        static_cast<uint_t>(std::round(settings.pitchFrameSizeMs * sampleRate / 1000.0))));
    auto* pitchInput = new_fvec(aubioHopSize);
    auto* pitchOutput = new_fvec(1);
    auto* onsetOutput = new_fvec(1);
    auto* pitch = new_aubio_pitch("yinfft", aubioBufferSize, aubioHopSize, static_cast<uint_t>(sampleRate));
    auto* onset = new_aubio_onset("specflux", aubioBufferSize, aubioHopSize, static_cast<uint_t>(sampleRate));

    if (pitchInput == nullptr || pitchOutput == nullptr || onsetOutput == nullptr || pitch == nullptr || onset == nullptr)
    {
        if (onset != nullptr) del_aubio_onset(onset);
        if (onsetOutput != nullptr) del_fvec(onsetOutput);
        if (pitch != nullptr) del_aubio_pitch(pitch);
        if (pitchOutput != nullptr) del_fvec(pitchOutput);
        if (pitchInput != nullptr) del_fvec(pitchInput);
        return notes;
    }

    aubio_pitch_set_unit(pitch, "Hz");
    aubio_pitch_set_silence(pitch, static_cast<smpl_t>(settings.silenceDb));
    aubio_pitch_set_tolerance(pitch, 0.75f);
    aubio_onset_set_threshold(onset, static_cast<smpl_t>(settings.onsetThreshold));
    aubio_onset_set_silence(onset, static_cast<smpl_t>(settings.silenceDb));

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
            fvec_set_sample(pitchInput, static_cast<smpl_t>(value), static_cast<uint_t>(i));
        }

        aubio_onset_do(onset, pitchInput, onsetOutput);
        aubio_pitch_do(pitch, pitchInput, pitchOutput);

        const bool onsetDetected = fvec_get_sample(onsetOutput, 0) > 0.0f;
        const auto levelDb = static_cast<double>(aubio_db_spl(pitchInput));
        const bool isSilent = !std::isfinite(levelDb) || levelDb <= settings.silenceDb;
        const auto hz = static_cast<double>(fvec_get_sample(pitchOutput, 0));
        const auto confidence = static_cast<double>(aubio_pitch_get_confidence(pitch));
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

    del_aubio_pitch(pitch);
    del_aubio_onset(onset);
    del_fvec(onsetOutput);
    del_fvec(pitchOutput);
    del_fvec(pitchInput);

    return notes;
}

std::vector<NoteJudgment> judgeReferenceNotes(
    const std::vector<ReferenceNote>& referenceNotes,
    const std::vector<PlayedNote>& playedNotes,
    const JudgmentSettings& settings)
{
    std::vector<NoteJudgment> judgments;
    judgments.reserve(referenceNotes.size());

    std::vector<bool> used(playedNotes.size(), false);

    for (const auto& reference : referenceNotes)
    {
        int bestIndex = -1;
        double bestScore = std::numeric_limits<double>::infinity();

        for (size_t i = 0; i < playedNotes.size(); ++i)
        {
            if (used[i])
                continue;

            const auto& played = playedNotes[i];
            const auto attackErrorMs = played.startMs - reference.timestampMs;
            if (std::abs(attackErrorMs) > settings.matchWindowMs)
                continue;

            const auto score = std::abs(attackErrorMs);

            if (score < bestScore)
            {
                bestScore = score;
                bestIndex = static_cast<int>(i);
            }
        }

        if (bestIndex < 0)
        {
            judgments.push_back({
                reference,
                std::nullopt,
                NoteJudgmentKind::Miss,
                false,
                0.0
            });
            continue;
        }

        used[static_cast<size_t>(bestIndex)] = true;
        const auto& played = playedNotes[static_cast<size_t>(bestIndex)];

        const auto attackErrorMs = played.startMs - reference.timestampMs;

        const bool badAttack = std::abs(attackErrorMs) > settings.attackToleranceMs;
        const bool inaccurate = badAttack;

        judgments.push_back({
            reference,
            played,
            inaccurate ? NoteJudgmentKind::Inaccurate : NoteJudgmentKind::Ok,
            badAttack,
            attackErrorMs
        });
    }

    return judgments;
}
} // namespace disband::session
