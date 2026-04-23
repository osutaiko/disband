// Session analysis utilities (data models & functions) for Disband.

#pragma once

#include <juce_audio_basics/juce_audio_basics.h>
#include <juce_core/juce_core.h>

#include <optional>
#include <vector>

namespace disband::session
{
// Reference note from score (usually Tab)
struct ReferenceNote
{
    int id = -1;
    double timestampMs = 0.0;            // Time relative to WAV start
    double durationMs = 0.0;
    int midi = -1;
};

// Played (detected) note
struct PlayedNote
{
    double startMs = 0.0;                // Time relative to WAV start
    double endMs = 0.0;
    double frequencyHz = 0.0;
    int midi = -1;
    double confidence = 0.0;
    double velocity = 0.0;
    std::vector<double> waveformProfile;
};

// Config used in segmentation
struct DetectionSettings
{
    double hopSizeMs = 5.0;              // step size of analysis frame
    double pitchFrameSizeMs = 110.0;     // frame size for pitch estimation
    double pitchMinHz = 28.0;            // lowest pitch to detect
    double pitchMaxHz = 3000.0;          // highest pitch to detect
    double onsetThreshold = 0.22;        // peak picking threshold passed to aubio
    double onsetCompensationMs = 10.0;   // subtract from onset timestamp to offset detector latency
    double silenceDb = -40.0;            // below treated as silence
    double minNoteMs = 50.0;             // shortest length of note to detect
    double velocityAnalysisWindowMs = 20.0;
    int waveformProfileCycleCount = 4;
    int minMidi = 24; // C1              // min MIDI value to detect
    int maxMidi = 96; // C7              // max MIDI value to detect
    double minPitchConfidence = 0.15;    // min confidence from aubio pitch detection to trust
};

// Overall judgment for a single note (compiles lots of criteria)
enum class NoteJudgmentKind
{
    Unjudged,
    Ok,
    Inaccurate,
    Miss
};

// Evaluation of each note judging criterion
struct CriterionJudgment
{
    std::optional<double> error;         // value of error (ms, dB, semitones, ...)
    std::optional<bool> pass;
};

// Detailed judgment result for a single reference note
struct NoteJudgment
{
    int referenceIndex = -1;
    std::optional<int> playedIndex;
    bool inRecordedTimeframe = false;    // whether the note is inside (time-wise) the range of detected notes
                                         // note irrelevant for judging if false
    NoteJudgmentKind kind = NoteJudgmentKind::Unjudged; // Overall judgment
    CriterionJudgment attack;
    CriterionJudgment release;
    CriterionJudgment pitch;
    CriterionJudgment velocity;
    CriterionJudgment muting;
    CriterionJudgment articulation;
};

struct SessionMatchingResult
{
    std::vector<std::optional<int>> referenceToPlayed; // vector of matchings from reference to played notes
                                                       // note that some elements might be null
    std::vector<std::optional<int>> playedToReference; // vector of matchings from played to reference notes
};

struct SessionNoteJudgmentResult
{
    std::vector<NoteJudgment> noteJudgments;
    std::vector<std::optional<int>> referenceToPlayed;
    std::vector<std::optional<int>> playedToReference;
};

// Config used in judgment
struct JudgmentSettings
{
    double matchWindowMs = 500.0;
    double attackOkWindowMs = 40.0;
    double attackInaccurateWindowMs = 190.0;
    double releaseToleranceMs = 70.0;
    double pitchToleranceSemitones = 0.3;
    double velocityToleranceDbLower = -4.4;
    double velocityToleranceDbUpper = 6.0;
    double articulationToleranceMult = 0.5;
};

CriterionJudgment evaluateCriterionAbs(double errorValue, double tolerance);
CriterionJudgment evaluateCriterionRange(double value, double toleranceLower, double toleranceUpper);

SessionMatchingResult sessionMatching(
    const std::vector<ReferenceNote>& referenceNotes,
    const std::vector<PlayedNote>& playedNotes,
    const JudgmentSettings& settings = {});

SessionNoteJudgmentResult judgeSession(
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

std::vector<NoteJudgment> judgeNoteJudgments(
    const std::vector<ReferenceNote>& referenceNotes,
    const std::vector<PlayedNote>& playedNotes,
    const JudgmentSettings& settings = {});
} // namespace disband::session
