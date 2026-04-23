// Judgment error calculation for note timings: attack & release.
//
// Attack:
//   Very simple, return the absolute attack time difference.
//
// Release: 
//   A bit more complicated, use both duration and abolute release time. 
//   - For longer notes, 
//     Even when you start (attack) the note with some error,
//     you are able to react and correct yourself for the release.
//   - For shorter notes, using absolute end-time error is unfair,
//     because attack shifts can dominate the actual phrasing.
//     (Such should belong to attack errors)
//
//   Use smooth interpolation between two thresholds: kDurationDrivenMs, kReleaseDrivenMs.

#include "errors.h"

#include <algorithm>

namespace disband::session
{
namespace
{
constexpr double kDurationDrivenMs = 150.0;
constexpr double kReleaseDrivenMs = 600.0;

// Smooth interpolation in 0 ~ 1
double smoothstep01(double t)
{
    const double clamped = std::clamp(t, 0.0, 1.0);
    return clamped * clamped * (3.0 - 2.0 * clamped);
}
} // namespace

double getAttackErrorMs(const PlayedNote& playedNote, const ReferenceNote& referenceNote)
{
    return playedNote.startMs - referenceNote.timestampMs;
}

double getReleaseErrorMs(const PlayedNote& playedNote, const ReferenceNote& referenceNote)
{
    // Absolute release timestamp errors
    const double referenceReleaseMs = referenceNote.timestampMs + referenceNote.durationMs;
    const double releaseTimeErrorMs = playedNote.endMs - referenceReleaseMs;

    // Duration errors
    const double playedDurationMs = std::max(0.0, playedNote.endMs - playedNote.startMs);
    const double durationErrorMs = playedDurationMs - referenceNote.durationMs;

    // Determine weights by reference note's duration
    const double blendT = (referenceNote.durationMs - kDurationDrivenMs)
        / (kReleaseDrivenMs - kDurationDrivenMs);
    const double releaseWeight = smoothstep01(blendT);
    const double durationWeight = 1.0 - releaseWeight;

    return (durationWeight * durationErrorMs) + (releaseWeight * releaseTimeErrorMs);
}
} // namespace disband::session
