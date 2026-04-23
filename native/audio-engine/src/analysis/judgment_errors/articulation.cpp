// Judgment error calculation for note articulation.

#include "analysis/judgment_errors/session_scan.h"

namespace disband::session
{
double getArticulationErrorScore(
    const juce::AudioBuffer<float>& mono,
    const PlayedNote& playedNote,
    double sampleRate,
    const std::vector<double>& songCycleTemplate)
{
    if (playedNote.frequencyHz <= 0.0)
        return 0.0;

    const auto noteCycleProfile = computeNoteCycleProfile(
        mono,
        playedNote,
        sampleRate,
        static_cast<int>(songCycleTemplate.size()));

    return compareWaveformProfiles(noteCycleProfile, songCycleTemplate);
}
} // namespace disband::session
