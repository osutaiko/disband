#include "session.h"

#include <algorithm>
#include <cmath>
#include <limits>

namespace disband::session::note_extractor
{
double frequencyToMidi(double hz);
}

namespace disband::session
{

SessionJudgmentResult judgeSession(
    const std::vector<ReferenceNote>& referenceNotes,
    const std::vector<PlayedNote>& playedNotes,
    const JudgmentSettings& settings)
{
    SessionJudgmentResult result;

    result.referenceResults.resize(referenceNotes.size());
    result.referenceToPlayed.resize(referenceNotes.size(), std::nullopt);
    result.playedToReference.resize(playedNotes.size(), std::nullopt);

    std::vector<bool> usedPlayed(playedNotes.size(), false);
    const bool hasPlayedNotes = !playedNotes.empty();
    const double firstDetectedAttackMs = hasPlayedNotes
        ? playedNotes.front().startMs
        : 0.0;
    const double lastDetectedReleaseMs = hasPlayedNotes
        ? playedNotes.front().endMs
        : 0.0;

    double minStartMs = firstDetectedAttackMs;
    double maxEndMs = lastDetectedReleaseMs;
    for (const auto& played : playedNotes)
    {
        minStartMs = std::min(minStartMs, played.startMs);
        maxEndMs = std::max(maxEndMs, played.endMs);
    }

    for (size_t refIndex = 0; refIndex < referenceNotes.size(); ++refIndex)
    {
        const auto& reference = referenceNotes[refIndex];
        ReferenceJudgmentResult refResult;
        refResult.referenceIndex = static_cast<int>(refIndex);
        refResult.kind = NoteJudgmentKind::Unjudged;

        if (!hasPlayedNotes)
        {
            result.referenceResults[refIndex] = std::move(refResult);
            continue;
        }

        const double referenceAttackMs = reference.timestampMs;
        const double referenceReleaseMs = reference.timestampMs + reference.durationMs;
        const bool isWithinDetectedWindow =
            referenceAttackMs >= (minStartMs - settings.matchWindowMs)
            && referenceReleaseMs <= (maxEndMs + settings.matchWindowMs);

        if (!isWithinDetectedWindow)
        {
            result.referenceResults[refIndex] = std::move(refResult);
            continue;
        }

        int bestPlayedIndex = -1;
        double bestScore = std::numeric_limits<double>::infinity();
        const auto refMidi = static_cast<double>(reference.midi);

        for (size_t playedIndex = 0; playedIndex < playedNotes.size(); ++playedIndex)
        {
            if (usedPlayed[playedIndex])
                continue;

            const auto& played = playedNotes[playedIndex];
            const double attackErrorMs =
                played.startMs - reference.timestampMs;

            if (std::abs(attackErrorMs) > settings.matchWindowMs)
                continue;

            double playedMidi = static_cast<double>(played.midi);
            if (playedMidi < 0.0 && played.frequencyHz > 0.0)
                playedMidi = note_extractor::frequencyToMidi(played.frequencyHz);

            const double pitchErrorSemitones =
                (refMidi >= 0.0 && playedMidi >= 0.0)
                ? std::abs(playedMidi - refMidi)
                : 0.0;

            const double playedDurationMs = std::max(0.0, played.endMs - played.startMs);
            const double durationErrorMs = std::abs(playedDurationMs - reference.durationMs);
            const double attackTerm =
                std::abs(attackErrorMs) / std::max(1.0, settings.attackToleranceMs);
            const double pitchTerm = pitchErrorSemitones;
            const double durationTerm =
                durationErrorMs / std::max(1.0, reference.durationMs);
            const double score = attackTerm + pitchTerm + durationTerm;

            if (score < bestScore)
            {
                bestScore = score;
                bestPlayedIndex = static_cast<int>(playedIndex);
            }
        }

        if (bestPlayedIndex < 0)
        {
            refResult.kind = NoteJudgmentKind::Miss;
            result.referenceResults[refIndex] = std::move(refResult);
            continue;
        }

        usedPlayed[static_cast<size_t>(bestPlayedIndex)] = true;
        result.referenceToPlayed[refIndex] = bestPlayedIndex;
        result.playedToReference[static_cast<size_t>(bestPlayedIndex)] =
            static_cast<int>(refIndex);

        const auto& played =
            playedNotes[static_cast<size_t>(bestPlayedIndex)];

        const double attackErrorMs =
            played.startMs - reference.timestampMs;

        const bool badAttack =
            std::abs(attackErrorMs) > settings.attackToleranceMs;

        refResult.playedIndex = bestPlayedIndex;
        refResult.kind =
            badAttack ? NoteJudgmentKind::Inaccurate
                      : NoteJudgmentKind::Ok;
        refResult.badAttack = badAttack;
        refResult.attackErrorMs = attackErrorMs;

        result.referenceResults[refIndex] = std::move(refResult);
    }

    return result;
}

} // namespace disband::session
