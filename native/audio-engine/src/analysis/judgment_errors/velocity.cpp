// Judgment error calculation for note velocity.
//
// We get averageVelocity from session_scan.cpp.

#include "errors.h"

namespace disband::session
{
double getVelocityMultiplier(const PlayedNote& playedNote, double averageVelocity)
{
    if (averageVelocity <= 0.0) return 1.0;
    return playedNote.velocity / averageVelocity;
}
} // namespace disband::session
