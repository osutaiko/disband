// Session analysis utilities for Disband.
//
// Defines data models & functions used in audio analysis.

#pragma once

#include <juce_audio_basics/juce_audio_basics.h>
#include <juce_core/juce_core.h>

#include <optional>
#include <vector>

namespace disband::session
{
struct ReferenceNote
{
    int id = -1;
    double timestampMs = 0.0;
    double durationMs = 0.0;
    int midi = -1;
};

struct PlayedNote
{
    double startMs = 0.0;
    double endMs = 0.0;
    double frequencyHz = 0.0;
    int midi = -1;
    double confidence = 0.0;
};

struct DetectionSettings
{
    double hopSizeMs = 5.0;
    double pitchFrameSizeMs = 110.0;
    double pitchMinHz = 28.0;
    double pitchMaxHz = 3000.0;
    double onsetThreshold = 0.22;
    double silenceDb = -40.0;
    double minNoteMs = 50.0;
    int minMidi = 24; // C1
    int maxMidi = 96; // C7
    double minPitchConfidence = 0.15;
};

enum class NoteJudgmentKind
{
    Unjudged,
    Ok,
    Inaccurate,
    Miss
};

// Judgment for a single reference note
struct ReferenceJudgmentResult
{
    int referenceIndex = -1;
    std::optional<int> playedIndex;
    NoteJudgmentKind kind = NoteJudgmentKind::Miss;
    bool badAttack = false;
    double attackErrorMs = 0.0;
};

// Judgments for the whole session
struct SessionJudgmentResult
{
    std::vector<ReferenceJudgmentResult> referenceResults;
    std::vector<std::optional<int>> referenceToPlayed;
    std::vector<std::optional<int>> playedToReference;
};

struct JudgmentSettings
{
    double matchWindowMs = 500.0;
    double attackToleranceMs = 20.0;
    double releaseToleranceMs = 40.0;
    double pitchToleranceSemitones = 0.3;
    double velocityToleranceMult = 0.6;
    double articulationToleranceMult = 0.4;
};

SessionJudgmentResult judgeSession(
    const std::vector<ReferenceNote>& referenceNotes,
    const std::vector<PlayedNote>& playedNotes,
    const JudgmentSettings& settings = {});

bool loadMonoWavFile(
    const juce::File& file,
    juce::AudioBuffer<float>& outMono,
    double& outSampleRate,
    juce::String& outError);

std::vector<PlayedNote> extractMonophonicNotes(
    const juce::AudioBuffer<float>& mono,
    double sampleRate,
    const DetectionSettings& settings = {});

std::vector<ReferenceJudgmentResult> judgeReferenceNotes(
    const std::vector<ReferenceNote>& referenceNotes,
    const std::vector<PlayedNote>& playedNotes,
    const JudgmentSettings& settings = {});
} // namespace disband::session
