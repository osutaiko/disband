#pragma once

#include "analysis/session.h"

namespace disband::session
{
struct NoteWindowFeatures
{
    double velocityRms = 0.0;
};

NoteWindowFeatures computeNoteWindowFeatures(
    const juce::AudioBuffer<float>& mono,
    int startSample,
    int sampleCount);

double getAverageVelocity(const std::vector<PlayedNote>& playedNotes);
} // namespace disband::session
