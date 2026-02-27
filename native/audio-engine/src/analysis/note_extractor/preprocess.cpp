#include "internal.h"

#include <algorithm>
#include <cmath>

namespace disband::session::note_extractor
{
void normalizeWorkingBuffer(juce::AudioBuffer<float>& workingBuffer)
{
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
}
} // namespace disband::session::note_extractor
