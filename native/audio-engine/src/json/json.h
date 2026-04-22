#pragma once

#include "analysis/session.h"

namespace disband::app
{
juce::String buildDefaultSettingsJson();
juce::String buildAnalysisResultJson(
    const std::vector<disband::session::PlayedNote>& played,
    const disband::session::SessionNoteJudgmentResult& sessionNoteJudgment);
}
