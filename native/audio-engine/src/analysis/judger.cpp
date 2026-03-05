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
// Convert error values into CriterionEvaluation object
CriterionEvaluation evaluateCriterion(double errorValue, double tolerance)
{
    CriterionEvaluation evaluation;
    evaluation.error = errorValue;
    evaluation.pass = std::abs(errorValue) <= tolerance;
    return evaluation;
}

bool isPass(const CriterionEvaluation& criterion)
{
    return criterion.pass.has_value() && *criterion.pass;
}

bool isExplicitFail(const CriterionEvaluation& criterion)
{
    return criterion.pass.has_value() && !*criterion.pass;
}
} // namespace

// Judge the entire session (list of notes)
SessionJudgmentResult judgeSession(
    const std::vector<ReferenceNote>& referenceNotes,
    const std::vector<PlayedNote>& playedNotes,
    const JudgmentSettings& settings)
{
    SessionJudgmentResult result;
    result.referenceResults.resize(referenceNotes.size());

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
        ReferenceJudgmentResult refResult;
        refResult.referenceIndex = static_cast<int>(refIndex);
        refResult.attack = {};
        refResult.release = {};
        refResult.pitch = {};
        refResult.velocity = {};
        refResult.muting = {};
        refResult.articulation = {};

        const auto playedIndex = result.referenceToPlayed[refIndex]; // might not exist
        refResult.playedIndex = playedIndex;

        const auto& referenceNote = referenceNotes[refIndex];
        const double referenceStartMs = referenceNote.timestampMs;
        const double referenceEndMs = referenceNote.timestampMs + referenceNote.durationMs;
        refResult.inRecordedTimeframe =
            hasPlayedNotes
            && referenceStartMs >= minRecordedStartMs
            && referenceEndMs <= maxRecordedEndMs;

        // Don't judge if the reference note is outside of recorded boundary
        if (!playedIndex.has_value())
        {
            refResult.kind = refResult.inRecordedTimeframe
                ? NoteJudgmentKind::Miss
                : NoteJudgmentKind::Unjudged;
            result.referenceResults[refIndex] = std::move(refResult);
            continue;
        }

        const auto& playedNote = playedNotes[static_cast<size_t>(*playedIndex)];
        refResult.attack =
            evaluateCriterion(getAttackErrorMs(referenceNote, playedNote), settings.attackOkWindowMs);
        refResult.release =
            evaluateCriterion(getReleaseErrorMs(referenceNote, playedNote), settings.releaseToleranceMs);
        refResult.pitch =
            evaluateCriterion(getPitchErrorSemitones(referenceNote, playedNote), settings.pitchToleranceSemitones);

        const bool pitchWrong = !isPass(refResult.pitch);
        const bool attackOutsideInaccurateWindow = std::abs(*refResult.attack.error) > settings.attackInaccurateWindowMs;

        // Miss immediately if pitch or attack fails check
        if (pitchWrong || attackOutsideInaccurateWindow)
        {
            refResult.kind = NoteJudgmentKind::Miss;
            result.referenceResults[refIndex] = std::move(refResult);
            continue;
        }

        // Inaccurate if attack is inaccurate (inside inaccurate window)
        if (isExplicitFail(refResult.attack) && !attackOutsideInaccurateWindow)
        {
            refResult.kind = NoteJudgmentKind::Inaccurate;
            result.referenceResults[refIndex] = std::move(refResult);
            continue;
        }

        // Count secondary criteria failures
        int secondaryFails = 0;
        secondaryFails += isExplicitFail(refResult.release) ? 1 : 0;
        secondaryFails += isExplicitFail(refResult.muting) ? 1 : 0;
        secondaryFails += isExplicitFail(refResult.articulation) ? 1 : 0;

        refResult.kind = secondaryFails >= 2
            ? NoteJudgmentKind::Inaccurate
            : NoteJudgmentKind::Ok;

        result.referenceResults[refIndex] = std::move(refResult);
    }

    return result;
}

std::vector<ReferenceJudgmentResult> judgeReferenceNotes(
    const std::vector<ReferenceNote>& referenceNotes,
    const std::vector<PlayedNote>& playedNotes,
    const JudgmentSettings& settings)
{
    return judgeSession(referenceNotes, playedNotes, settings).referenceResults;
}
} // namespace disband::session
