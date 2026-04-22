// Common utils for building JSONs as a contract.

#include "json.h"

#include <juce_core/juce_core.h>

namespace disband::app
{
juce::String buildDefaultSettingsJson()
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

    return juce::JSON::toString(root);
}

juce::String buildAnalysisResultJson(
    const std::vector<disband::session::PlayedNote>& played,
    const disband::session::SessionNoteJudgmentResult& sessionNoteJudgment)
{
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
        obj->setProperty(
            "playedIndex",
            noteJudgment.playedIndex.has_value() ? juce::var(*noteJudgment.playedIndex) : juce::var());
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

    juce::Array<juce::var> jsonPlayedToReference;
    for (const auto& p : sessionNoteJudgment.playedToReference)
        jsonPlayedToReference.add(p.has_value() ? juce::var(*p) : juce::var());

    juce::Array<juce::var> jsonReferenceToPlayed;
    for (const auto& r : sessionNoteJudgment.referenceToPlayed)
        jsonReferenceToPlayed.add(r.has_value() ? juce::var(*r) : juce::var());

    rootObj->setProperty("noteJudgments", juce::var(jsonNoteJudgments));
    rootObj->setProperty("referenceToPlayed", juce::var(jsonReferenceToPlayed));
    rootObj->setProperty("playedToReference", juce::var(jsonPlayedToReference));

    return juce::JSON::toString(root);
}
} // namespace disband::app
