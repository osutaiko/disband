#include "internal.h"

#include <algorithm>
#include <cmath>

namespace disband::session::note_extractor
{
AubioContext createAubioContext(
    int hopSize,
    double sampleRate,
    const DetectionSettings& settings)
{
    AubioContext context;

    const auto aubioHopSize = static_cast<uint_t>(hopSize);
    const auto aubioBufferSize = nextPowerOfTwo(std::max<uint_t>(
        aubioHopSize * 4u,
        static_cast<uint_t>(std::round(settings.pitchFrameSizeMs * sampleRate / 1000.0))));

    context.pitchInput = new_fvec(aubioHopSize);
    context.pitchOutput = new_fvec(1);
    context.onsetOutput = new_fvec(1);
    context.pitch = new_aubio_pitch("yinfft", aubioBufferSize, aubioHopSize, static_cast<uint_t>(sampleRate));
    context.onset = new_aubio_onset("specflux", aubioBufferSize, aubioHopSize, static_cast<uint_t>(sampleRate));

    if (context.pitchInput == nullptr || context.pitchOutput == nullptr
        || context.onsetOutput == nullptr || context.pitch == nullptr || context.onset == nullptr)
    {
        destroyAubioContext(context);
        return context;
    }

    aubio_pitch_set_unit(context.pitch, "Hz");
    aubio_pitch_set_silence(context.pitch, static_cast<smpl_t>(settings.silenceDb));
    aubio_pitch_set_tolerance(context.pitch, 0.75f);
    aubio_onset_set_threshold(context.onset, static_cast<smpl_t>(settings.onsetThreshold));
    aubio_onset_set_silence(context.onset, static_cast<smpl_t>(settings.silenceDb));

    return context;
}

void destroyAubioContext(AubioContext& context)
{
    if (context.pitch != nullptr)
        del_aubio_pitch(context.pitch);
    if (context.onset != nullptr)
        del_aubio_onset(context.onset);
    if (context.onsetOutput != nullptr)
        del_fvec(context.onsetOutput);
    if (context.pitchOutput != nullptr)
        del_fvec(context.pitchOutput);
    if (context.pitchInput != nullptr)
        del_fvec(context.pitchInput);

    context.pitch = nullptr;
    context.onset = nullptr;
    context.onsetOutput = nullptr;
    context.pitchOutput = nullptr;
    context.pitchInput = nullptr;
}
} // namespace disband::session::note_extractor
