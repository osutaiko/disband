#include "errors.h"

#include <algorithm>

namespace disband::session
{
namespace
{
constexpr double kDurationDrivenMs = 150.0;
constexpr double kReleaseDrivenMs = 600.0;

double smoothstep01(double t)
{
    const double clamped = std::clamp(t, 0.0, 1.0);
    return clamped * clamped * (3.0 - 2.0 * clamped);
}
} // namespace

double getAttackErrorMs(const ReferenceNote& referenceNote, const PlayedNote& playedNote)
{
    return playedNote.startMs - referenceNote.timestampMs;
}

double getReleaseErrorMs(const ReferenceNote& referenceNote, const PlayedNote& playedNote)
{
    const double referenceReleaseMs = referenceNote.timestampMs + referenceNote.durationMs;
    const double releaseTimeErrorMs = playedNote.endMs - referenceReleaseMs;

    const double playedDurationMs = std::max(0.0, playedNote.endMs - playedNote.startMs);
    const double durationErrorMs = playedDurationMs - referenceNote.durationMs;

    const double blendT = (referenceNote.durationMs - kDurationDrivenMs)
        / (kReleaseDrivenMs - kDurationDrivenMs);
    const double releaseWeight = smoothstep01(blendT);
    const double durationWeight = 1.0 - releaseWeight;

    return (durationWeight * durationErrorMs) + (releaseWeight * releaseTimeErrorMs);
}
} // namespace disband::session
