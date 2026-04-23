// Judging logic (pass/fail for each criterion, ) for played notes.
//
// Judging criteria with 3 tiers
//   primary: pitch, attack
//   secondary: release, muting, articulation
//   tertiary: velocity
//     - generally fine even when violated (for now)
//
// Miss if either:
//   - wrong pitch
//   - terrible attack timing
//
// Inaccurate if either:
//   - inaccurate attack timing
//   - at least two wiolations in:
//     - release timing
//     - muting quality
//     - articulation
//
// Ok otherwise!

#include "session.h"
#include "judgment_errors/errors.h"

#include <algorithm>
#include <cmath>
#include <limits>

namespace disband::session
{
namespace
{
bool isPass(const CriterionJudgment& criterion)
{
    return criterion.pass.has_value() && *criterion.pass;
}

bool isExplicitFail(const CriterionJudgment& criterion)
{
    return criterion.pass.has_value() && !*criterion.pass;
}
} // namespace

// Judge the entire session (list of notes)
SessionNoteJudgmentResult judgeSession(
    const std::vector<ReferenceNote>& referenceNotes,
    const std::vector<PlayedNote>& playedNotes,
    const JudgmentSettings& settings)
{
    SessionNoteJudgmentResult result;
    result.noteJudgments.resize(referenceNotes.size());
    const double averageVelocity = getAverageVelocity(playedNotes);

    // Get note correspondence mappings
    const SessionMatchingResult matching = sessionMatching(referenceNotes, playedNotes, settings);
    result.referenceToPlayed = matching.referenceToPlayed;
    result.playedToReference = matching.playedToReference;

    const bool hasPlayedNotes = !playedNotes.empty();

    // Get the time boundary of the set of detected notes.
    // Note that this is different from the recorded session (WAV) timeframe.
    double minRecordedStartMs = 0.0;
    double maxRecordedEndMs = 0.0;
    if (hasPlayedNotes)
    {
        minRecordedStartMs = playedNotes.front().startMs;
        maxRecordedEndMs = playedNotes.front().endMs;
        for (const auto& played : playedNotes)
        {
            minRecordedStartMs = std::min(minRecordedStartMs, played.startMs);
            maxRecordedEndMs = std::max(maxRecordedEndMs, played.endMs);
        }
    }

    // Iterate through reference notes
    for (size_t refIndex = 0; refIndex < referenceNotes.size(); ++refIndex)
    {
        NoteJudgment noteJudgment;
        noteJudgment.referenceIndex = static_cast<int>(refIndex);
        noteJudgment.attack = {};
        noteJudgment.release = {};
        noteJudgment.pitch = {};
        noteJudgment.velocity = {};
        noteJudgment.muting = {};
        noteJudgment.articulation = {};

        const auto playedIndex = result.referenceToPlayed[refIndex]; // might not exist
        noteJudgment.playedIndex = playedIndex;

        const auto& referenceNote = referenceNotes[refIndex];
        const double referenceStartMs = referenceNote.timestampMs;
        const double referenceEndMs = referenceNote.timestampMs + referenceNote.durationMs;
        noteJudgment.inRecordedTimeframe =
            hasPlayedNotes
            && referenceStartMs >= minRecordedStartMs
            && referenceEndMs <= maxRecordedEndMs;

        // Don't judge if the reference note is outside of recorded boundary
        if (!playedIndex.has_value())
        {
            noteJudgment.kind = noteJudgment.inRecordedTimeframe
                ? NoteJudgmentKind::Miss
                : NoteJudgmentKind::Unjudged;
            result.noteJudgments[refIndex] = std::move(noteJudgment);
            continue;
        }

        const auto& playedNote = playedNotes[static_cast<size_t>(*playedIndex)];
        noteJudgment.attack =
            evaluateCriterionAbs(getAttackErrorMs(playedNote, referenceNote), settings.attackOkWindowMs);
        noteJudgment.release =
            evaluateCriterionAbs(getReleaseErrorMs(playedNote, referenceNote), settings.releaseToleranceMs);
        noteJudgment.pitch =
            evaluateCriterionAbs(getPitchErrorSemitones(playedNote, referenceNote), settings.pitchToleranceSemitones);
        const double velocityDbDifference = getVelocityDbDifference(playedNote, averageVelocity);
        noteJudgment.velocity = evaluateCriterionRange(
            velocityDbDifference,
            settings.velocityToleranceDbLower,
            settings.velocityToleranceDbUpper);
        noteJudgment.velocity.error = velocityDbDifference;

        const bool pitchWrong = !isPass(noteJudgment.pitch);
        const bool attackOutsideInaccurateWindow = std::abs(*noteJudgment.attack.error) > settings.attackInaccurateWindowMs;

        // Miss immediately if pitch or attack fails check
        if (pitchWrong || attackOutsideInaccurateWindow)
        {
            noteJudgment.kind = NoteJudgmentKind::Miss;
            result.noteJudgments[refIndex] = std::move(noteJudgment);
            continue;
        }

        // Inaccurate if attack is inaccurate (inside inaccurate window)
        if (isExplicitFail(noteJudgment.attack) && !attackOutsideInaccurateWindow)
        {
            noteJudgment.kind = NoteJudgmentKind::Inaccurate;
            result.noteJudgments[refIndex] = std::move(noteJudgment);
            continue;
        }

        // Count secondary criteria failures
        int secondaryFails = 0;
        secondaryFails += isExplicitFail(noteJudgment.release) ? 1 : 0;
        secondaryFails += isExplicitFail(noteJudgment.muting) ? 1 : 0;
        secondaryFails += isExplicitFail(noteJudgment.articulation) ? 1 : 0;

        noteJudgment.kind = secondaryFails >= 2
            ? NoteJudgmentKind::Inaccurate
            : NoteJudgmentKind::Ok;

        result.noteJudgments[refIndex] = std::move(noteJudgment);
    }

    return result;
}

std::vector<NoteJudgment> judgeNoteJudgments(
    const std::vector<ReferenceNote>& referenceNotes,
    const std::vector<PlayedNote>& playedNotes,
    const JudgmentSettings& settings)
{
    return judgeSession(referenceNotes, playedNotes, settings).noteJudgments;
}
} // namespace disband::session
