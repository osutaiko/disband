// Judgment error calculation for note articulation.

#include "analysis/session.h"

#include <algorithm>
#include <cmath>
#include <limits>

namespace disband::session
{
namespace
{
// Calculate articulation score by Pearson correlation.
// Returns -1 [waveform is the exact opposite of reference] ~ 1 [waveforms are the same]
// corr(A,B) = cov(A,B) / sqrt(var(A)var(B))
double calculateCorrelationScore(
    const std::vector<double>& playedProfile,
    const std::vector<double>& referenceProfile)
{
    const size_t sampleCount = std::min(playedProfile.size(), referenceProfile.size());
    if (sampleCount == 0)
        return 0.0;

    // Compute means
    double playedMean = 0.0;
    double referenceMean = 0.0;
    for (size_t i = 0; i < sampleCount; ++i)
    {
        playedMean += playedProfile[i];
        referenceMean += referenceProfile[i];
    }
    playedMean /= static_cast<double>(sampleCount);
    referenceMean /= static_cast<double>(sampleCount);

    // Compute covariances
    double covariance = 0.0;
    double playedVariance = 0.0;
    double referenceVariance = 0.0;

    // variance(A) = mean((A_i - mean(A))^2)
    for (size_t i = 0; i < sampleCount; ++i)
    {
        const double playedCentered = playedProfile[i] - playedMean;
        const double referenceCentered = referenceProfile[i] - referenceMean;
        covariance += playedCentered * referenceCentered;
        playedVariance += playedCentered * playedCentered;
        referenceVariance += referenceCentered * referenceCentered;
    }

    const double denominator = std::sqrt(playedVariance * referenceVariance);
    if (denominator <= std::numeric_limits<double>::epsilon())
        return 0.0;

    const double correlation = std::clamp(covariance / denominator, -1.0, 1.0);
    return correlation;
}
} // namespace

// Error score = (1 - corr(A,B)) / 2
// Returns 0 [waveforms are the same] ~ 1
double getArticulationErrorScore(
    const PlayedNote& playedNote,
    const std::vector<double>& referenceProfile)
{
    if (playedNote.waveformProfile.empty() || referenceProfile.empty())
        return 0.0;

    return (1.0 - calculateCorrelationScore(playedNote.waveformProfile, referenceProfile)) / 2;
}
} // namespace disband::session
