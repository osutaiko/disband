#include "session.h"
#include "judgment_errors/errors.h"

#include <cmath>

namespace disband::session
{
NoteJudgmentKind judgeReferenceNote(
    const ReferenceNote& referenceNote,
    const PlayedNote& playedNote,
    const JudgmentSettings& settings)
{
    const double attackErrorMs = getAttackErrorMs(referenceNote, playedNote);
    const double releaseErrorMs = getReleaseErrorMs(referenceNote, playedNote);
    const double pitchErrorSemitones = getPitchErrorSemitones(referenceNote, playedNote);

    if (std::abs(attackErrorMs) > settings.attackToleranceMs)
        return NoteJudgmentKind::Inaccurate;

    if (std::abs(releaseErrorMs) > settings.releaseToleranceMs)
        return NoteJudgmentKind::Inaccurate;

    if (std::abs(pitchErrorSemitones) > settings.pitchToleranceSemitones)
        return NoteJudgmentKind::Inaccurate;

    return NoteJudgmentKind::Ok;
}

SessionJudgmentResult judgeSession(
    const std::vector<ReferenceNote>& referenceNotes,
    const std::vector<PlayedNote>& playedNotes,
    const JudgmentSettings& settings)
{
    SessionJudgmentResult result;
    result.referenceResults.resize(referenceNotes.size());

    const SessionMatchingResult matching = sessionMatching(referenceNotes, playedNotes, settings);
    result.referenceToPlayed = matching.referenceToPlayed;
    result.playedToReference = matching.playedToReference;

    for (size_t refIndex = 0; refIndex < referenceNotes.size(); ++refIndex)
    {
        ReferenceJudgmentResult refResult;
        refResult.referenceIndex = static_cast<int>(refIndex);

        const auto playedIndex = result.referenceToPlayed[refIndex];
        refResult.playedIndex = playedIndex;

        if (!playedIndex.has_value())
        {
            refResult.kind = NoteJudgmentKind::Miss;
            result.referenceResults[refIndex] = std::move(refResult);
            continue;
        }

        const auto& referenceNote = referenceNotes[refIndex];
        const auto& playedNote = playedNotes[static_cast<size_t>(*playedIndex)];

        refResult.attackErrorMs = getAttackErrorMs(referenceNote, playedNote);
        refResult.badAttack = std::abs(refResult.attackErrorMs) > settings.attackToleranceMs;
        refResult.kind = judgeReferenceNote(referenceNote, playedNote, settings);

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
