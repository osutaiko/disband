#pragma once

#include "analysis/session.h"

namespace disband::session
{
double getAttackErrorMs(const ReferenceNote& referenceNote, const PlayedNote& playedNote);
double getReleaseErrorMs(const ReferenceNote& referenceNote, const PlayedNote& playedNote);
double getPitchErrorSemitones(const ReferenceNote& referenceNote, const PlayedNote& playedNote);
} // namespace disband::session
