#include "session.h"

#include <cmath>
#include <limits>

namespace disband::session
{
std::vector<NoteJudgment> judgeReferenceNotes(
    const std::vector<ReferenceNote>& referenceNotes,
    const std::vector<PlayedNote>& playedNotes,
    const JudgmentSettings& settings)
{
    std::vector<NoteJudgment> judgments;
    judgments.reserve(referenceNotes.size());

    std::vector<bool> used(playedNotes.size(), false);

    for (const auto& reference : referenceNotes)
    {
        int bestIndex = -1;
        double bestScore = std::numeric_limits<double>::infinity();

        for (size_t i = 0; i < playedNotes.size(); ++i)
        {
            if (used[i])
                continue;

            const auto& played = playedNotes[i];
            const auto attackErrorMs = played.startMs - reference.timestampMs;
            if (std::abs(attackErrorMs) > settings.matchWindowMs)
                continue;

            const auto score = std::abs(attackErrorMs);

            if (score < bestScore)
            {
                bestScore = score;
                bestIndex = static_cast<int>(i);
            }
        }

        if (bestIndex < 0)
        {
            judgments.push_back({
                reference,
                std::nullopt,
                NoteJudgmentKind::Miss,
                false,
                0.0
            });
            continue;
        }

        used[static_cast<size_t>(bestIndex)] = true;
        const auto& played = playedNotes[static_cast<size_t>(bestIndex)];

        const auto attackErrorMs = played.startMs - reference.timestampMs;

        const bool badAttack = std::abs(attackErrorMs) > settings.attackToleranceMs;
        const bool inaccurate = badAttack;

        judgments.push_back({
            reference,
            played,
            inaccurate ? NoteJudgmentKind::Inaccurate : NoteJudgmentKind::Ok,
            badAttack,
            attackErrorMs
        });
    }

    return judgments;
}
} // namespace disband::session
