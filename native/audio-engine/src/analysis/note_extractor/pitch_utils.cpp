#include "internal.h"

#include <cmath>

namespace disband::session::note_extractor
{
namespace
{
constexpr double kA4Hz = 440.0;
} // namespace

double frequencyToMidi(double hz)
{
    if (hz <= 0.0)
        return -1.0;
    return 69.0 + 12.0 * std::log2(hz / kA4Hz);
}

uint_t nextPowerOfTwo(uint_t value)
{
    if (value <= 2u)
        return 2u;

    --value;
    value |= value >> 1u;
    value |= value >> 2u;
    value |= value >> 4u;
    value |= value >> 8u;
    value |= value >> 16u;
    return value + 1u;
}
} // namespace disband::session::note_extractor
