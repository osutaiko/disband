// Disband audio analyzer app entry point.
// One-shot process: --analyze-wav <wavPath>

#include <juce_core/juce_core.h>
#include <juce_gui_basics/juce_gui_basics.h>

#include "log.h"
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
        const disband::session::DetectionSettings detectionDefaults;
        const disband::session::JudgmentSettings judgmentDefaults;

        auto* rootObj = new juce::DynamicObject();
        juce::var root(rootObj);
        auto* audioDeviceObj = new juce::DynamicObject();
        rootObj->setProperty("audioDevice", juce::var(audioDeviceObj));

        auto* playbackObj = new juce::DynamicObject();
        playbackObj->setProperty("pxPerMs", 0.25);
        playbackObj->setProperty("soundfontPreset", "generaluser-gs");
        rootObj->setProperty("playback", juce::var(playbackObj));

        auto* noteDetectionObj = new juce::DynamicObject();
        noteDetectionObj->setProperty("hopSizeMs", detectionDefaults.hopSizeMs);
        noteDetectionObj->setProperty("pitchFrameSizeMs", detectionDefaults.pitchFrameSizeMs);
        noteDetectionObj->setProperty("pitchMinHz", detectionDefaults.pitchMinHz);
        noteDetectionObj->setProperty("pitchMaxHz", detectionDefaults.pitchMaxHz);
        noteDetectionObj->setProperty("onsetThreshold", detectionDefaults.onsetThreshold);
        noteDetectionObj->setProperty("onsetCompensationMs", detectionDefaults.onsetCompensationMs);
        noteDetectionObj->setProperty("silenceDb", detectionDefaults.silenceDb);
        noteDetectionObj->setProperty("minNoteMs", detectionDefaults.minNoteMs);
        noteDetectionObj->setProperty("velocityAnalysisWindowMs", detectionDefaults.velocityAnalysisWindowMs);
        noteDetectionObj->setProperty("minPitchConfidence", detectionDefaults.minPitchConfidence);
        noteDetectionObj->setProperty("minMidi", detectionDefaults.minMidi);
        noteDetectionObj->setProperty("maxMidi", detectionDefaults.maxMidi);
        rootObj->setProperty("noteDetection", juce::var(noteDetectionObj));

        auto* judgmentObj = new juce::DynamicObject();
        judgmentObj->setProperty("matchWindowMs", judgmentDefaults.matchWindowMs);
        judgmentObj->setProperty("attackOkWindowMs", judgmentDefaults.attackOkWindowMs);
        judgmentObj->setProperty("attackInaccurateWindowMs", judgmentDefaults.attackInaccurateWindowMs);
        judgmentObj->setProperty("releaseToleranceMs", judgmentDefaults.releaseToleranceMs);
        judgmentObj->setProperty("pitchToleranceSemitones", judgmentDefaults.pitchToleranceSemitones);
        judgmentObj->setProperty("velocityToleranceDbLower", judgmentDefaults.velocityToleranceDbLower);
        judgmentObj->setProperty("velocityToleranceDbUpper", judgmentDefaults.velocityToleranceDbUpper);
        judgmentObj->setProperty("articulationToleranceMult", judgmentDefaults.articulationToleranceMult);
        rootObj->setProperty("judgment", juce::var(judgmentObj));

        std::fprintf(stdout, "%s\n", juce::JSON::toString(root).toRawUTF8());
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

        auto* rootObj = new juce::DynamicObject();
        juce::var root(rootObj);

        juce::Array<juce::var> jsonPlayed;
        for (const auto& p : played)
        {
            auto* obj = new juce::DynamicObject();
            obj->setProperty("startMs", p.startMs);
            obj->setProperty("endMs", p.endMs);
            obj->setProperty("midi", p.midi);
            obj->setProperty("hz", p.frequencyHz);
            obj->setProperty("confidence", p.confidence);
            obj->setProperty("velocity", p.velocity);
            jsonPlayed.add(juce::var(obj));
        }
        rootObj->setProperty("playedNotes", juce::var(jsonPlayed));

        juce::Array<juce::var> jsonNoteJudgments;
        juce::Array<juce::var> jsonPlayedToReference;

        if (!referenceNotes.empty())
        {
            for (const auto& noteJudgment : sessionNoteJudgment.noteJudgments)
            {
                auto* obj = new juce::DynamicObject();
                auto toCriterionVar = [](const disband::session::CriterionJudgment& criterion) -> juce::var
                {
                    auto* cobj = new juce::DynamicObject();
                    cobj->setProperty(
                        "error",
                        criterion.error.has_value() ? juce::var(*criterion.error) : juce::var());
                    cobj->setProperty(
                        "pass",
                        criterion.pass.has_value() ? juce::var(*criterion.pass) : juce::var());
                    return juce::var(cobj);
                };
                auto toKindString = [](disband::session::NoteJudgmentKind kind) -> juce::String
                {
                    switch (kind)
                    {
                    case disband::session::NoteJudgmentKind::Ok:
                        return "ok";
                    case disband::session::NoteJudgmentKind::Inaccurate:
                        return "inaccurate";
                    case disband::session::NoteJudgmentKind::Miss:
                        return "miss";
                    case disband::session::NoteJudgmentKind::Unjudged:
                    default:
                        return "unjudged";
                    }
                };

                obj->setProperty("referenceIndex", noteJudgment.referenceIndex);
                obj->setProperty("playedIndex",
                    noteJudgment.playedIndex.has_value() ? juce::var(*noteJudgment.playedIndex)
                                            : juce::var());
                obj->setProperty("inRecordedTimeframe", noteJudgment.inRecordedTimeframe);
                obj->setProperty("kind", toKindString(noteJudgment.kind));

                auto* criteria = new juce::DynamicObject();
                criteria->setProperty("attack", toCriterionVar(noteJudgment.attack));
                criteria->setProperty("release", toCriterionVar(noteJudgment.release));
                criteria->setProperty("pitch", toCriterionVar(noteJudgment.pitch));
                criteria->setProperty("velocity", toCriterionVar(noteJudgment.velocity));
                criteria->setProperty("muting", toCriterionVar(noteJudgment.muting));
                criteria->setProperty("articulation", toCriterionVar(noteJudgment.articulation));
                obj->setProperty("criteria", juce::var(criteria));
                jsonNoteJudgments.add(juce::var(obj));
            }

            for (const auto& p : sessionNoteJudgment.playedToReference)
                jsonPlayedToReference.add(p.has_value() ? juce::var(*p) : juce::var());
        }

        juce::Array<juce::var> jsonReferenceToPlayed;
        if (!referenceNotes.empty())
        {
            for (const auto& r : sessionNoteJudgment.referenceToPlayed)
                jsonReferenceToPlayed.add(r.has_value() ? juce::var(*r) : juce::var());
        }

        rootObj->setProperty("noteJudgments", juce::var(jsonNoteJudgments));
        rootObj->setProperty("referenceToPlayed", juce::var(jsonReferenceToPlayed));
        rootObj->setProperty("playedToReference", juce::var(jsonPlayedToReference));

        std::fprintf(stdout, "%s\n", juce::JSON::toString(root).toRawUTF8());
        std::fflush(stdout);
    }
};
} // namespace disband::audio_analyze

START_JUCE_APPLICATION(disband::audio_analyze::AudioAnalyzeApp)
