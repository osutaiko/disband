# Disband

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
- Project setup
  - [X] Electron / Vite boilerplate
  - [X] Project directory organization (feature-oriented)
- Basic UI layout
  - [X] Shell layout
  - [X] Panel UI setup
- Tab engine (AlphaTab)
  - [X] TabViewPanel layout
  - [X] Tab rendering
  - [X] .gp* file metadata parsing
  - [X] Hotkeys / navigation
- Audio mixing (also partially AlphaTab)
  - [X] Track display
  - [X] Score track switching
  - [X] Volume/muting/solo control
  - [X] Recorded audio output & mixing
  - [ ] Audio clip manipulation (cutting)
- Native app
  - Audio capture (`disband-audio-capture.exe --output <wavPath>`)
    - [X] JUCE setup
    - [X] Frontend UI
    - [X] Hook with frontend
    - [ ] Audio input selector
  - Audio analysis (`disband-audio-analyze.exe --analyze-wav <wavPath>`)
    - [X] aubio setup
    - [X] Waveform display
    - Note extraction
      - [X] Segmentation with envelope analysis
      - [X] Pitch detection
      - [X] Velocity detection
      - [X] Note articulation detection
      - [ ] Slide detection
      - [ ] Multi-note detection scheme (chords...)
    - [X] Note correspondence matching - ref<->played
    - Note judgment
      - [X] Scoring / accuracy system
      - [X] Frontend UI
    - Realtime analysis
- Testing
  - [ ] TODO
  
