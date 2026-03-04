#include "errors.h"

#include <cmath>

namespace disband::session
{
namespace
{
double frequencyToMidi(double hz)
{
    if (hz <= 0.0)
        return -1.0;

    return 69.0 + 12.0 * std::log2(hz / 440.0);
}
} // namespace

double getPitchErrorSemitones(const ReferenceNote& referenceNote, const PlayedNote& playedNote)
{
    if (referenceNote.midi < 0)
        return 0.0;

    double playedMidi = static_cast<double>(playedNote.midi);
    if (playedMidi < 0.0 && playedNote.frequencyHz > 0.0)
        playedMidi = frequencyToMidi(playedNote.frequencyHz);

    if (playedMidi < 0.0)
        return 0.0;

    return playedMidi - static_cast<double>(referenceNote.midi);
}
} // namespace disband::session
