// Helpers for criteria that require comparisons with the rest of the song.

#include "session_scan.h"

#include <algorithm>
#include <cmath>

namespace disband::session
{
// Compute features aggregated from each sample within the window
NoteWindowFeatures computeNoteWindowFeatures(
    const juce::AudioBuffer<float>& mono,
    int startSample,
    int sampleCount)
{
    NoteWindowFeatures analysis;
    if (mono.getNumChannels() <= 0 || mono.getNumSamples() <= 0) return analysis;
    if (sampleCount <= 0) return analysis;
    if (startSample < 0 || startSample >= mono.getNumSamples()) return analysis;

    const int endSample = std::min(startSample + sampleCount, mono.getNumSamples());
    if (endSample <= startSample) return analysis;

    // Calculation for RMS (velocityRms)
    const float* samples = mono.getReadPointer(0);
    double sumSquares = 0.0;
    for (int i = startSample; i < endSample; ++i)
    {
        // Aggregate squares...
        const double sample = static_cast<double>(samples[i]);
        sumSquares += sample * sample;
    }

    const int count = endSample - startSample;

    // ... then sqrt
    // Object only has velocityRms for now
    analysis.velocityRms = count > 0 ? std::sqrt(sumSquares / static_cast<double>(count)) : 0.0;
    return analysis;
}

double getAverageVelocity(const std::vector<PlayedNote>& playedNotes)
{
    double sum = 0.0;
    int count = 0;
    for (const auto& played : playedNotes)
    {
        if (played.velocity <= 0.0)
            continue;
        sum += played.velocity;
        ++count;
    }
    return count > 0 ? sum / static_cast<double>(count) : 0.0;
}
} // namespace disband::session
