// Note judgment logic for session analysis.
// 
// Compares reference notes (music score in frontend) to played notes and assigns judgments.
// Uses greedy matching and labels as:
//    - Ok
//    - Inaccurate: within window but at least one of the following is bad
//      - attack timing
//      - release timing (duration)
//      - pitch (midi or Hz)
//      - muting
//      - Compared with while recorded file...
//        - velocity
//        - timbre
//    - Miss: no note input within window

#include "session.h"

#include <cmath>
#include <limits>

namespace disband::session
{
std::vector<ReferenceJudgmentResult> judgeReferenceNotes(
    const std::vector<ReferenceNote>& referenceNotes,
    const std::vector<PlayedNote>& playedNotes,
    const JudgmentSettings& settings)
{
    std::vector<ReferenceJudgmentResult> judgments;
    judgments.reserve(referenceNotes.size());

    std::vector<bool> used(playedNotes.size(), false);

    for (size_t referenceIndex = 0; referenceIndex < referenceNotes.size(); ++referenceIndex)
    {
        const auto& reference = referenceNotes[referenceIndex];
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
                static_cast<int>(referenceIndex),
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
            static_cast<int>(referenceIndex),
            bestIndex,
            inaccurate ? NoteJudgmentKind::Inaccurate : NoteJudgmentKind::Ok,
            badAttack,
            attackErrorMs
        });
    }

    return judgments;
}
} // namespace disband::session
