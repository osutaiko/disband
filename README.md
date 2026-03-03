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
- Tab display (AlphaTab)
  - [X] TabViewPanel layout
  - [X] .gp* file parsing
  - [X] Tab rendering
  - [X] Hotkeys / navigation
- Audio mixing (also partially AlphaTab)
  - [X] Track display
  - [X] Score track switching
  - [X] Volume/muting/solo control
  - [ ] Recorded audio output & mixing
- Native app (`disband-audio-engine.exe`)
  - Audio capture (`--output <wavPath>`)
    - [X] JUCE setup
    - [X] Frontend UI
    - [X] Hook with frontend
    - [ ] Audio input selector
  - Audio analysis (`--analyze-wav <wavPath>`)
    - [X] aubio setup
    - [X] Waveform display
    - Note extraction
      - [X] Segmentation with envelope analysis
      - [ ] Pitch detection
      - [ ] Velocity detection
      - [ ] Muting detection (articulation)
      - [ ] Multi-note detection scheme (chords...)
    - [ ] Note correspondence matching
    - Note judgment
      - [ ] Scoring / accuracy system
      - [X] Frontend UI
    - Realtime analysis
  
