// Disband audio analyzer app entry point.
// One-shot process: --analyze-wav <wavPath>

#include <juce_core/juce_core.h>
#include <juce_gui_basics/juce_gui_basics.h>

#include "common/log.h"
#include "json/json.h"
#include "analysis/session.h"

#include <cstdio>
#include <iostream>
#include <iterator>
#include <string>

namespace disband::audio_analyze
{
namespace
{
struct CommandLineOptions
{
    juce::String analysisPath;
    bool printDefaultSettings = false;
};

CommandLineOptions parseCommandLineOptions()
{
    CommandLineOptions options;
    const auto args = juce::JUCEApplication::getInstance()->getCommandLineParameterArray();
    for (int i = 0; i < args.size(); ++i)
    {
        if (args[i] == "--print-default-settings")
            options.printDefaultSettings = true;
        if (args[i] == "--analyze-wav" && i + 1 < args.size())
            options.analysisPath = args[i + 1];
    }
    return options;
}
} // namespace

class AudioAnalyzeApp final : public juce::JUCEApplication
{
public:
    AudioAnalyzeApp() = default;

    const juce::String getApplicationName() override { return "Disband Audio Analyze"; }
    const juce::String getApplicationVersion() override { return "0.1.0"; }

    void initialise(const juce::String&) override
    {
        const auto options = parseCommandLineOptions();
        if (options.printDefaultSettings)
        {
            printDefaultSettings();
            quit();
            return;
        }
        if (options.analysisPath.isEmpty())
        {
            disband::app::log("audio-analyze", "missing --analyze-wav path\n");
            setApplicationReturnValue(1);
            quit();
            return;
        }

        runBaselineAnalysis(options.analysisPath);
        quit();
    }

    void shutdown() override {}

private:
    void printDefaultSettings()
    {
        const auto json = disband::app::buildDefaultSettingsJson();
        std::fprintf(stdout, "%s\n", json.toRawUTF8());
        std::fflush(stdout);
    }

    void runBaselineAnalysis(const juce::String& wavPath)
    {
        juce::AudioBuffer<float> monoBuffer;
        double sampleRate = 0.0;
        juce::String error;

        if (!disband::session::loadMonoWavFile(
                juce::File(wavPath), monoBuffer, sampleRate, error))
        {
            disband::app::log("audio-analyze", "analysis failed: %s\n", error.toRawUTF8());
            setApplicationReturnValue(1);
            return;
        }

        const auto played =
            disband::session::extractMonophonicNotes(monoBuffer, sampleRate);

        std::string input;
        input.assign(
            std::istreambuf_iterator<char>(std::cin),
            std::istreambuf_iterator<char>());

        std::vector<disband::session::ReferenceNote> referenceNotes;

        if (!input.empty())
        {
            const juce::var parsed = juce::JSON::parse(juce::String(input));
            if (parsed.isArray())
            {
                for (const auto& v : *parsed.getArray())
                {
                    if (!v.isObject()) continue;
                    const auto* obj = v.getDynamicObject();

                    disband::session::ReferenceNote r;
                    r.id = int(obj->getProperty("id"));
                    r.timestampMs = double(obj->getProperty("timestamp"));
                    r.durationMs = double(obj->getProperty("length"));
                    r.midi = int(obj->getProperty("midi"));
                    referenceNotes.push_back(r);
                }
            }
        }

        disband::session::SessionNoteJudgmentResult sessionNoteJudgment;

        if (!referenceNotes.empty())
            sessionNoteJudgment = disband::session::judgeSession(referenceNotes, played);

        const auto json = disband::app::buildAnalysisResultJson(played, sessionNoteJudgment);
        std::fprintf(stdout, "%s\n", json.toRawUTF8());
        std::fflush(stdout);
    }
};
} // namespace disband::audio_analyze

START_JUCE_APPLICATION(disband::audio_analyze::AudioAnalyzeApp)
