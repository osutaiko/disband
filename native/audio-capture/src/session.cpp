#include "session.h"

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
constexpr double kMinHz = 40.0;
constexpr double kMaxHz = 1600.0;

double clamp01(double value)
{
    return std::max(0.0, std::min(1.0, value));
}

double frequencyToMidi(double hz)
{
    if (hz <= 0.0)
        return -1.0;
    return 69.0 + 12.0 * std::log2(hz / kA4Hz);
}

double computeRms(const float* samples, int count)
{
    if (samples == nullptr || count <= 0)
        return 0.0;

    double sum = 0.0;
    for (int i = 0; i < count; ++i)
        sum += static_cast<double>(samples[i]) * static_cast<double>(samples[i]);

    return std::sqrt(sum / static_cast<double>(count));
}

std::pair<double, double> estimatePitchHzAutocorrelation(
    const float* samples,
    int count,
    double sampleRate)
{
    if (samples == nullptr || count <= 0 || sampleRate <= 0.0)
        return { 0.0, 0.0 };

    const int minLag = std::max(1, static_cast<int>(std::floor(sampleRate / kMaxHz)));
    const int maxLag = std::max(minLag + 1, static_cast<int>(std::ceil(sampleRate / kMinHz)));
    if (maxLag >= count)
        return { 0.0, 0.0 };

    double zeroLag = 0.0;
    for (int i = 0; i < count; ++i)
        zeroLag += static_cast<double>(samples[i]) * static_cast<double>(samples[i]);
    if (zeroLag <= std::numeric_limits<double>::epsilon())
        return { 0.0, 0.0 };

    int bestLag = -1;
    double bestCorrelation = 0.0;

    for (int lag = minLag; lag <= maxLag; ++lag)
    {
        double corr = 0.0;
        for (int i = 0; i < count - lag; ++i)
            corr += static_cast<double>(samples[i]) * static_cast<double>(samples[i + lag]);

        if (corr > bestCorrelation)
        {
            bestCorrelation = corr;
            bestLag = lag;
        }
    }

    if (bestLag <= 0)
        return { 0.0, 0.0 };

    const auto confidence = clamp01(bestCorrelation / zeroLag);
    const auto hz = sampleRate / static_cast<double>(bestLag);
    return { hz, confidence };
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

    const int frameSize = std::max(16, static_cast<int>(std::round(settings.frameSizeMs * sampleRate / 1000.0)));
    const int hopSize = std::max(1, static_cast<int>(std::round(settings.hopSizeMs * sampleRate / 1000.0)));
    if (frameSize >= workingBuffer.getNumSamples())
        return notes;

    const float* samples = workingBuffer.getReadPointer(0);
    const int maxStart = workingBuffer.getNumSamples() - frameSize;

    bool inNote = false;
    int noteStartSample = 0;
    int lowEnergyFrames = 0;
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
            int midiRounded = -1;
            if (hz > 0.0)
            {
                const auto midiRaw = frequencyToMidi(hz);
                const int midiCandidate = static_cast<int>(std::lround(midiRaw));
                if (midiCandidate >= settings.minMidi && midiCandidate <= settings.maxMidi)
                    midiRounded = midiCandidate;
            }

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
        weightedHz = 0.0;
        totalWeight = 0.0;
        confidenceSum = 0.0;
        confidentFrames = 0;
    };

    for (int frameStart = 0; frameStart <= maxStart; frameStart += hopSize)
    {
        const auto* frame = samples + frameStart;
        const auto rms = computeRms(frame, frameSize);
        const auto [hz, confidence] = estimatePitchHzAutocorrelation(frame, frameSize, sampleRate);
        const bool hasPitch = hz >= kMinHz && hz <= kMaxHz && confidence >= settings.minPitchConfidence;

        if (!inNote)
        {
            if (rms >= settings.rmsOnThreshold)
            {
                inNote = true;
                noteStartSample = frameStart;
                lowEnergyFrames = 0;
                if (hasPitch)
                {
                    weightedHz = hz * confidence;
                    totalWeight = confidence;
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

        if (rms < settings.rmsOffThreshold)
        {
            ++lowEnergyFrames;
        }
        else
        {
            lowEnergyFrames = 0;
            if (hasPitch)
            {
                weightedHz += hz * confidence;
                totalWeight += confidence;
                confidenceSum += confidence;
                ++confidentFrames;
            }
        }

        if (lowEnergyFrames >= 2)
            flushCurrentNote(frameStart);
    }

    flushCurrentNote(workingBuffer.getNumSamples() - 1);
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
