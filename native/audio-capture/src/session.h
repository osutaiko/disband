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
    double pitchFrameSizeMs = 80.0;
    double pitchMinHz = 30.0;
    double pitchMaxHz = 3000.0;
    double onsetThreshold = 0.35;
    double silenceDb = -40.0;
    double minNoteMs = 60.0;
    int minMidi = 24; // C1
    int maxMidi = 96; // C7
    double minPitchConfidence = 0.15;
};

enum class NoteJudgmentKind
{
    Ok,
    Inaccurate,
    Miss
};

struct NoteJudgment
{
    ReferenceNote reference;
    std::optional<PlayedNote> played;
    NoteJudgmentKind kind = NoteJudgmentKind::Miss;
    bool badAttack = false;
    double attackErrorMs = 0.0;
};

struct JudgmentSettings
{
    double matchWindowMs = 120.0;
    double attackToleranceMs = 50.0;
};

bool loadMonoWavFile(
    const juce::File& file,
    juce::AudioBuffer<float>& outMono,
    double& outSampleRate,
    juce::String& outError);

std::vector<PlayedNote> extractMonophonicNotes(
    const juce::AudioBuffer<float>& mono,
    double sampleRate,
    const DetectionSettings& settings = {});

std::vector<NoteJudgment> judgeReferenceNotes(
    const std::vector<ReferenceNote>& referenceNotes,
    const std::vector<PlayedNote>& playedNotes,
    const JudgmentSettings& settings = {});
} // namespace disband::session
