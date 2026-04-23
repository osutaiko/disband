#pragma once

#include "analysis/session.h"
#include "analysis/judgment_errors/session_scan.h"

namespace disband::session
{
double getAttackErrorMs(const PlayedNote& playedNote, const ReferenceNote& referenceNote);
double getReleaseErrorMs(const PlayedNote& playedNote, const ReferenceNote& referenceNote);
double getPitchErrorSemitones(const PlayedNote& playedNote, const ReferenceNote& referenceNote);
double getVelocityDbDifference(const PlayedNote& playedNote, double averageVelocity);
double getArticulationErrorScore(const PlayedNote& playedNote, const std::vector<double>& referenceProfile);
} // namespace disband::session
