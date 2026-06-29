# Disband
A rhythm game-like band instrument learning app, for advanced players && analytic nerds

## Stack
### Frontend
TypeScript/HTML/CSS
- Electron
- React
- Vite
- Tailwind CSS
- Zustand
- [AlphaTab](https://alphatab.net/)

### Backend (Native)
C++
- [JUCE](https://juce.com/)
- [aubio](https://aubio.org/)
- CMake

## Milestones
### Project foundation
- [X] Electron / Vite boilerplate
- [X] Project directory organization (feature-oriented)
- [X] Options (Preferences) screen
- [X] Shell layout
- [X] Panel UI setup
      
### Tab engine (AlphaTab)
- [X] TabViewPanel layout
- [X] Tab rendering
- [X] .gp* file metadata parsing
- [X] Hotkeys / navigation
- [X] Tempo & time signature mapping
- [X] Repeat/endings parsing

### Audio mixing & Game experience
- [X] Track display
- [X] Score track switching
- [X] Track volume/muting/solo control
- [X] Recorded audio output & mixing
- [ ] Audio clip manipulation (cut, move, split)
- [ ] Multiple take recording with "best take" selection
- [ ] Noise gating
- [ ] Offset calibration tool

### Native app
- Audio capture (`disband-audio-capture.exe --output <wavPath>`)
  - [X] JUCE setup
  - [X] Frontend UI
  - [X] Hook with frontend
  - [ ] Audio input selector
  - [ ] Metadata (sample rate & buffer size) options
  - [ ] Latency test tool
- Audio analysis (`disband-audio-analyze.exe --analyze-wav <wavPath>`)
  - [X] aubio setup
  - [X] Waveform display
  - Note extraction
    - [X] Segmentation with envelope analysis
    - [X] Pitch detection
    - [X] Velocity detection
    - [X] Note articulation detection
    - [ ] Slide / bend detection
    - [ ] Hammer-on / off detection
    - [ ] Multiple note detection scheme (chords...)
  - [X] Note correspondence matching - ref<->played
  - Note judgment
    - [X] Scoring / accuracy system
    - [X] Frontend UI
    - [X] Timing criteria (attack & release)
    - [X] Pitch criteria
    - [X] Articulation criteria (waveform)
    - [X] Velocity criteria
    - [ ] Muting criteria
  - Realtime analysis
    - [ ] TODO
### Testing
- [ ] TODO
