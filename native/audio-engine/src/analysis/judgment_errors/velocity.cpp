// Judgment error calculation for note velocity.

#include "errors.h"

#include <algorithm>
#include <cmath>

namespace disband::session
{
// 20 log(vel / vel_ref)
double getVelocityDbDifference(const PlayedNote& playedNote, double averageVelocity)
{
    if (averageVelocity <= 0.0) return 0.0;
    const double ratio = playedNote.velocity / averageVelocity;
    constexpr double kMinRatio = 1e-12;
    return 20.0 * std::log10(std::max(ratio, kMinRatio));
}
} // namespace disband::session
