// Internal utilities for note extraction with aubio.

#pragma once

#include "../session.h"

#include <aubio.h>

namespace disband::session::note_extractor
{
double frequencyToMidi(double hz);
uint_t nextPowerOfTwo(uint_t value);

void normalizeWorkingBuffer(juce::AudioBuffer<float>& workingBuffer);

struct AubioContext
{
    fvec_t* pitchInput = nullptr;
    fvec_t* pitchOutput = nullptr;
    fvec_t* onsetOutput = nullptr;
    aubio_pitch_t* pitch = nullptr;
    aubio_onset_t* onset = nullptr;
};

AubioContext createAubioContext(
    int hopSize,
    double sampleRate,
    const DetectionSettings& settings);

void destroyAubioContext(AubioContext& context);

std::vector<PlayedNote> detectNotes(
    const juce::AudioBuffer<float>& workingBuffer,
    int hopSize,
    double sampleRate,
    const DetectionSettings& settings,
    AubioContext& context);
} // namespace disband::session::note_extractor
