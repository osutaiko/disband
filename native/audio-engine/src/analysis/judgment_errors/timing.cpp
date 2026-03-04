#include "errors.h"

namespace disband::session
{
double getAttackErrorMs(const ReferenceNote& referenceNote, const PlayedNote& playedNote)
{
    return playedNote.startMs - referenceNote.timestampMs;
}

double getReleaseErrorMs(const ReferenceNote& referenceNote, const PlayedNote& playedNote)
{
    const double referenceReleaseMs = referenceNote.timestampMs + referenceNote.durationMs;
    return playedNote.endMs - referenceReleaseMs;
}
} // namespace disband::session
