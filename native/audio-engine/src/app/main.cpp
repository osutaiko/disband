// Disband app entry point.
//
// 1) Recording mode (`--output <wavPath>`)
//    - Capture mono mic input into <wavPath> as WAV
//    - Stop capture on "stop" recieved in stdin
//
// 2) Analysis mode (`--analyze-wav <wavPath>`) 
//    - Load & extract notes with aubio from WAV
//    - Print notes as JSON to stdout

#include <juce_audio_devices/juce_audio_devices.h>
#include <juce_audio_formats/juce_audio_formats.h>
#include <juce_core/juce_core.h>
#include <juce_gui_basics/juce_gui_basics.h>

#include "analysis/session.h"

#include <cstdarg>
#include <cstdio>
#include <iostream>
#include <iterator>
#include <string>
#include <thread>

namespace disband::audio_capture
{
namespace
{
constexpr double kSampleRate = 48000.0;
constexpr unsigned int kChannels = 1;
constexpr int kBitsPerSample = 16;

struct CommandLineOptions
{
    juce::String outputPath;
    juce::String analysisPath;
};

void log(const char* format, ...)
{
    std::fprintf(stderr, "[audio-sidecar] ");
    va_list args;
    va_start(args, format);
    std::vfprintf(stderr, format, args);
    va_end(args);
    std::fflush(stderr);
}

CommandLineOptions parseCommandLineOptions()
{
    CommandLineOptions options;
    const auto args = juce::JUCEApplication::getInstance()->getCommandLineParameterArray();
    for (int i = 0; i < args.size(); ++i)
    {
        if (args[i] == "--output" && i + 1 < args.size())
            options.outputPath = args[i + 1];
        if (args[i] == "--analyze-wav" && i + 1 < args.size())
            options.analysisPath = args[i + 1];
    }
    return options;
}
} // namespace

class DisbandAudioRecorder : public juce::AudioIODeviceCallback
{
public:
    DisbandAudioRecorder() : writerThread("DisbandAudioWriter")
    {
        writerThread.startThread();
    }

    ~DisbandAudioRecorder() override
    {
        stopRecording();
        writerThread.stopThread(1000);
    }

    bool startRecording(const juce::File& file)
    {
        stopRecording();
        file.getParentDirectory().createDirectory();

        auto stream = file.createOutputStream();
        if (!stream || !stream->openedOk())
            return false;

        juce::WavAudioFormat format;
        auto* writer = format.createWriterFor(
            stream.release(),
            kSampleRate,
            kChannels,
            kBitsPerSample,
            {},
            0
        );

        if (writer == nullptr)
            return false;

        auto newThreadedWriter = std::make_unique<juce::AudioFormatWriter::ThreadedWriter>(
            writer,
            writerThread,
            static_cast<int>(kSampleRate)
        );

        {
            const juce::ScopedLock lock(writerLock);
            threadedWriter = std::move(newThreadedWriter);
            activeWriter = threadedWriter.get();
        }

        return true;
    }

    void stopRecording()
    {
        const juce::ScopedLock lock(writerLock);
        activeWriter = nullptr;
        threadedWriter.reset();
    }

    void audioDeviceIOCallbackWithContext(
        const float* const* inputChannelData,
        int numInputChannels,
        float* const* /*outputChannelData*/,
        int /*numOutputChannels*/,
        int numSamples,
        const juce::AudioIODeviceCallbackContext& /*context*/
    ) override
    {
        if (numInputChannels <= 0 || numSamples <= 0) return;

        monoBuffer.setSize(1, numSamples, false, false, true);
        monoBuffer.clear();

        int contributingChannels = 0;
        for (int ch = 0; ch < numInputChannels; ++ch)
        {
            if (inputChannelData[ch] == nullptr) continue;
            monoBuffer.addFrom(0, 0, inputChannelData[ch], numSamples);
            ++contributingChannels;
        }

        if (contributingChannels > 1)
            monoBuffer.applyGain(0, 0, numSamples, 1.0f / static_cast<float>(contributingChannels));

        const juce::ScopedTryLock lock(writerLock);
        if (lock.isLocked() && activeWriter != nullptr)
        {
            const float* channelsPtr[1] = { monoBuffer.getReadPointer(0) };
            activeWriter->write(channelsPtr, numSamples);
        }
    }

    void audioDeviceAboutToStart(juce::AudioIODevice* /*device*/) override {}
    void audioDeviceStopped() override {}

private:
    juce::AudioBuffer<float> monoBuffer;
    juce::TimeSliceThread writerThread;
    juce::CriticalSection writerLock;
    std::unique_ptr<juce::AudioFormatWriter::ThreadedWriter> threadedWriter;
    juce::AudioFormatWriter::ThreadedWriter* activeWriter = nullptr;
};

class AudioCaptureApp final : public juce::JUCEApplication
{
public:
    AudioCaptureApp() = default;

    const juce::String getApplicationName() override { return "Disband Audio Capture"; }
    const juce::String getApplicationVersion() override { return "0.1.0"; }

    void initialise(const juce::String&) override
    {
        const auto options = parseCommandLineOptions();
        if (startAnalysisModeIfRequested(options))
            return;

        if (!startRecordingMode(options.outputPath))
            quit();
    }

    void shutdown() override
    {
        deviceManager.removeAudioCallback(&recorder);
        deviceManager.closeAudioDevice();

        if (controlThread.joinable())
            controlThread.join();
        recorder.stopRecording();
    }

private:
    bool startAnalysisModeIfRequested(const CommandLineOptions& options)
    {
        if (options.analysisPath.isEmpty())
            return false;

        runBaselineAnalysis(options.analysisPath);
        quit();
        return true;
    }

    bool startRecordingMode(const juce::String& output)
    {
        outputPath = output;
        if (outputPath.isEmpty())
        {
            log("missing output path\n");
            return false;
        }

        if (!recorder.startRecording(juce::File(outputPath)))
        {
            log("failed to open output file\n");
            return false;
        }

        log("recording output=\"%s\"\n", outputPath.toRawUTF8());

        if (!initialiseInputDevice())
            return false;

        controlThread = std::thread([this] { controlLoop(); });
        deviceManager.addAudioCallback(&recorder);
        return true;
    }

    bool initialiseInputDevice()
    {
        const auto initResult = deviceManager.initialise(1, 0, nullptr, true);
        if (initResult.isNotEmpty())
        {
            log("device init failed: %s\n", initResult.toRawUTF8());
            return false;
        }

        configureDevice();
        if (deviceManager.getCurrentAudioDevice() == nullptr)
        {
            log("no audio device available\n");
            return false;
        }

        return true;
    }

    void runBaselineAnalysis(const juce::String& wavPath)
    {
        juce::AudioBuffer<float> monoBuffer;
        double sampleRate = 0.0;
        juce::String error;

        if (!disband::session::loadMonoWavFile(
                juce::File(wavPath), monoBuffer, sampleRate, error))
        {
            log("analysis failed: %s\n", error.toRawUTF8());
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

        disband::session::SessionJudgmentResult judgment;

        if (!referenceNotes.empty())
        {
            judgment =
                disband::session::judgeSession(referenceNotes, played);
        }

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
            jsonPlayed.add(juce::var(obj));
        }
        rootObj->setProperty("playedNotes", juce::var(jsonPlayed));

        juce::Array<juce::var> jsonRefs;
        juce::Array<juce::var> jsonMap;

        if (!referenceNotes.empty())
        {
            for (const auto& r : judgment.referenceResults)
            {
                auto* obj = new juce::DynamicObject();
                obj->setProperty("referenceIndex", r.referenceIndex);
                obj->setProperty("playedIndex",
                    r.playedIndex.has_value() ? juce::var(*r.playedIndex)
                                            : juce::var());
                obj->setProperty("kind",
                    r.kind == disband::session::NoteJudgmentKind::Unjudged ? "unjudged" :
                    r.kind == disband::session::NoteJudgmentKind::Ok ? "ok" :
                    r.kind == disband::session::NoteJudgmentKind::Inaccurate ? "inaccurate" :
                    "miss");
                obj->setProperty("attackErrorMs", r.attackErrorMs);
                jsonRefs.add(juce::var(obj));
            }

            for (const auto& p : judgment.playedToReference)
                jsonMap.add(p.has_value() ? juce::var(*p) : juce::var());
        }

        juce::Array<juce::var> jsonReferenceToPlayed;
        if (!referenceNotes.empty())
        {
            for (const auto& r : judgment.referenceToPlayed)
                jsonReferenceToPlayed.add(r.has_value() ? juce::var(*r) : juce::var());
        }

        rootObj->setProperty("referenceJudgments", juce::var(jsonRefs));
        rootObj->setProperty("referenceToPlayed", juce::var(jsonReferenceToPlayed));
        rootObj->setProperty("playedToReference", juce::var(jsonMap));

        std::fprintf(stdout, "%s\n",
            juce::JSON::toString(root).toRawUTF8());
        std::fflush(stdout);
    }

    void configureDevice()
    {
        juce::AudioDeviceManager::AudioDeviceSetup setup;
        deviceManager.getAudioDeviceSetup(setup);
        setup.sampleRate = kSampleRate;
        setup.bufferSize = 128;
        const auto result = deviceManager.setAudioDeviceSetup(setup, true);
        if (result.isNotEmpty())
        {
            log("device setup failed: %s\n", result.toRawUTF8());
        }
    }

    void controlLoop()
    {
        std::string line;
        while (std::getline(std::cin, line))
        {
            if (line == "stop")
                break;
        }

        juce::MessageManager::callAsync([] {
            if (auto* app = juce::JUCEApplicationBase::getInstance())
                app->systemRequestedQuit();
        });
    }

    juce::AudioDeviceManager deviceManager;
    DisbandAudioRecorder recorder;
    std::thread controlThread;
    juce::String outputPath;
};
} // namespace disband::audio_capture

START_JUCE_APPLICATION(disband::audio_capture::AudioCaptureApp)
