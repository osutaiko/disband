#include "errors.h"

namespace disband::session::note_extraction
{
double frequencyToMidi(double hz);
}

namespace disband::session
{
double getPitchErrorSemitones(const ReferenceNote& referenceNote, const PlayedNote& playedNote)
{
    if (referenceNote.midi < 0)
        return 0.0;

    double playedMidi = static_cast<double>(playedNote.midi);
    if (playedMidi < 0.0 && playedNote.frequencyHz > 0.0)
        playedMidi = note_extraction::frequencyToMidi(playedNote.frequencyHz);

    if (playedMidi < 0.0)
        return 0.0;

    return playedMidi - static_cast<double>(referenceNote.midi);
}
} // namespace disband::session
