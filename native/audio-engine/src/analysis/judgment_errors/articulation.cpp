// Judgment error calculation for note articulation.

#include "analysis/session.h"

#include <algorithm>
#include <cmath>
#include <limits>

namespace disband::session
{
namespace
{
double calculateCorrelationScore(
    const std::vector<double>& playedProfile,
    const std::vector<double>& referenceProfile)
{
    const size_t sampleCount = std::min(playedProfile.size(), referenceProfile.size());
    if (sampleCount == 0)
        return 0.0;

    double playedMean = 0.0;
    double referenceMean = 0.0;
    for (size_t i = 0; i < sampleCount; ++i)
    {
        playedMean += playedProfile[i];
        referenceMean += referenceProfile[i];
    }
    playedMean /= static_cast<double>(sampleCount);
    referenceMean /= static_cast<double>(sampleCount);

    double covariance = 0.0;
    double playedVariance = 0.0;
    double referenceVariance = 0.0;
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

double getArticulationErrorScore(
    const PlayedNote& playedNote,
    const std::vector<double>& referenceProfile)
{
    if (playedNote.waveformProfile.empty() || referenceProfile.empty())
        return 0.0;

    return (1.0 - calculateCorrelationScore(playedNote.waveformProfile, referenceProfile)) / 2;
}
} // namespace disband::session
