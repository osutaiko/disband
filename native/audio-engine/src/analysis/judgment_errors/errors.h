#pragma once

#include "analysis/session.h"
#include "analysis/judgment_errors/session_scan.h"

namespace disband::session
{
double getAttackErrorMs(const ReferenceNote& referenceNote, const PlayedNote& playedNote);
double getReleaseErrorMs(const ReferenceNote& referenceNote, const PlayedNote& playedNote);
double getPitchErrorSemitones(const ReferenceNote& referenceNote, const PlayedNote& playedNote);
double getVelocityMultiplier(const PlayedNote& playedNote, double averageVelocity);
} // namespace disband::session
