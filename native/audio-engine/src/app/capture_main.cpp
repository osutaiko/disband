// Disband audio capture app entry point.
// Runs as a long-lived process controlled over stdin.

#include <juce_audio_devices/juce_audio_devices.h>
#include <juce_audio_formats/juce_audio_formats.h>
#include <juce_core/juce_core.h>
#include <juce_gui_basics/juce_gui_basics.h>

#include <cstdarg>
#include <cstdio>
#include <string>
#include <thread>

namespace disband::audio_capture
{
namespace
{
struct CommandLineOptions
{
    bool listDevices = false;
};

constexpr double kSampleRate = 48000.0;
constexpr unsigned int kChannels = 1;
constexpr int kBitsPerSample = 16;

void log(const char* format, ...)
{
    std::fprintf(stderr, "[audio-capture] ");
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
        if (args[i] == "--list-devices")
            options.listDevices = true;
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
        if (options.listDevices)
        {
            printDevices();
            quit();
            return;
        }

        if (!initialiseInputDevice())
        {
            quit();
            return;
        }

        deviceManager.addAudioCallback(&recorder);
        controlThread = std::thread([this] { controlLoopServer(); });
        log("recording server ready\n");
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
    void collectDeviceNames(bool input, juce::StringArray& outNames)
    {
        juce::AudioDeviceManager tempDeviceManager;
        juce::OwnedArray<juce::AudioIODeviceType> deviceTypes;
        tempDeviceManager.createAudioDeviceTypes(deviceTypes);

        for (auto* type : deviceTypes)
        {
            if (type == nullptr)
                continue;

            type->scanForDevices();
            const auto names = type->getDeviceNames(input);
            for (const auto& name : names)
            {
                if (!outNames.contains(name))
                    outNames.add(name);
            }
        }
    }

    void printDevices()
    {
        juce::StringArray inputDeviceNames;
        juce::StringArray outputDeviceNames;
        collectDeviceNames(true, inputDeviceNames);
        collectDeviceNames(false, outputDeviceNames);

        juce::Array<juce::var> inputJson;
        juce::Array<juce::var> outputJson;
        for (const auto& name : inputDeviceNames)
            inputJson.add(juce::var(name));
        for (const auto& name : outputDeviceNames)
            outputJson.add(juce::var(name));

        auto* rootObj = new juce::DynamicObject();
        rootObj->setProperty("inputs", juce::var(inputJson));
        rootObj->setProperty("outputs", juce::var(outputJson));
        const juce::var root(rootObj);

        std::fprintf(stdout, "%s\n", juce::JSON::toString(root).toRawUTF8());
        std::fflush(stdout);
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

    void configureDevice()
    {
        juce::AudioDeviceManager::AudioDeviceSetup setup;
        deviceManager.getAudioDeviceSetup(setup);
        setup.sampleRate = kSampleRate;
        setup.bufferSize = 128;
        const auto result = deviceManager.setAudioDeviceSetup(setup, true);
        if (result.isNotEmpty())
            log("device setup failed: %s\n", result.toRawUTF8());
    }

    void controlLoopServer()
    {
        std::string line;
        while (std::getline(std::cin, line))
        {
            if (line == "stop")
            {
                recorder.stopRecording();
                log("recording stopped\n");
                continue;
            }

            if (line == "quit")
                break;

            if (line.rfind("start ", 0) == 0)
            {
                const auto output = juce::String(line.substr(6));
                if (output.isEmpty())
                {
                    log("start failed: missing output path\n");
                    continue;
                }

                const auto ok = recorder.startRecording(juce::File(output));
                if (ok)
                    log("recording output=\"%s\"\n", output.toRawUTF8());
                else
                    log("start failed: could not open output file\n");
            }
        }

        juce::MessageManager::callAsync([] {
            if (auto* app = juce::JUCEApplicationBase::getInstance())
                app->systemRequestedQuit();
        });
    }

    juce::AudioDeviceManager deviceManager;
    DisbandAudioRecorder recorder;
    std::thread controlThread;
};
} // namespace disband::audio_capture

START_JUCE_APPLICATION(disband::audio_capture::AudioCaptureApp)
