# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a web-based polyrhythmic metronome application built with vanilla JavaScript, HTML, and CSS. The application uses the Web Audio API for precise timing and audio playback, providing advanced polyrhythmic capabilities with a reference track (4/4) and multiple configurable polyrhythm layers.

## Architecture

The codebase follows a modular structure:

- **Main Application** (`js/polyrhythmic-metronome.js`): Core polyrhythmic metronome logic using Web Audio API
  - Audio scheduling with precise timing using `scheduler()` function at js/polyrhythmic-metronome.js:491
  - Reference track (4/4) and polyrhythm beat tracking
  - Tempo synchronization system with `resyncAfterTempoChange()` at js/polyrhythmic-metronome.js:642
  - Individual beat muting functionality for all tracks
  - UI event handling and state management
  - Tap tempo functionality with buffer averaging at js/polyrhythmic-metronome.js:591

- **Audio Buffer Management** (`js/buffer-loader.js`): Handles loading and decoding audio files
  - Asynchronous audio file loading with XMLHttpRequest
  - Audio buffer creation for Web Audio API

- **Timing Worker** (`js/worker.js`): Web Worker for consistent timing
  - Separate thread for metronome tick scheduling
  - Message-based communication with main thread

- **UI Layer** (`index.html` + `css/main.css` + `css/components.css`): Interface controls
  - Unified main controls panel with reference track and transport
  - Responsive grid layout for mobile devices
  - Individual polyrhythm track controls with ratio selection
  - Beat visualizers with clickable mute functionality

## Key Components

### Audio Scheduling
The application uses a sophisticated scheduling system:
- `lookahead` (25ms) and `scheduleAheadTime` (0.1s) for precise timing
- Web Worker sends "tick" messages at regular intervals
- Main thread schedules audio events ahead of time using `scheduleTick()` at js/polyrhythmic-metronome.js:498
- Individual beat muting checked during scheduling at js/polyrhythmic-metronome.js:528 (reference) and js/polyrhythmic-metronome.js:551 (polyrhythms)

### Beat Emphasis and Pitch Variation
Different beat types have different pitches:
- **Reference track downbeat** (beat 0): Higher pitch (1.2x) at js/polyrhythmic-metronome.js:512
- **Reference track other beats**: Normal pitch (1.0x)
- **Polyrhythm downbeats** (beat 0): Base pitch × 1.2 at js/polyrhythmic-metronome.js:538
- **Polyrhythm other beats**: Each polyrhythm has unique base pitch from array at js/polyrhythmic-metronome.js:30
- **Pitch array**: `[1.2, 0.8, 1.5, 0.67, 1.33, 0.75, 1.25, 1.1]` (excludes 1.0 used by reference track)

### Polyrhythm System
- **Reference track**: Fixed 4/4 time signature
- **Polyrhythms**: Configurable ratios (2:4, 3:4, 5:4, 6:4, 7:4, 8:4, 9:4, 10:4, 11:4, 12:4, 13:4, 14:4, 15:4, 16:4)
- **Synchronization**: New polyrhythms sync to next reference cycle start at js/polyrhythmic-metronome.js:394
- **Tempo changes**: All tracks resync via `resyncAfterTempoChange()` to maintain timing relationships

### Individual Beat Muting
- **Data structure**: `mutedBeats` array for each track (reference and polyrhythms)
- **Visual feedback**: Beat dots turn grey when muted with `.muted` CSS class
- **Interaction**: Click any beat dot to toggle mute state
- **Audio logic**: Muted beats are skipped during playback but timing continues
- **State preservation**: Mute states preserved when changing polyrhythm ratios

### Tap Tempo
Implements tap tempo with averaging:
- Maintains buffer of recent tap intervals
- Calculates average timing for tempo determination
- Auto-resets after 2-second timeout
- Triggers tempo resynchronization

## Development

This is a static web application with no build process. To develop:

1. Serve files from a local web server (required for ES6 modules)
2. Open `index.html` in a browser
3. Test audio functionality (requires user interaction to start AudioContext)

## Controls

### Keyboard Shortcuts
- **Space bar**: Start/stop metronome
- **T key**: Tap tempo input

### Transport Controls
- **Play button**: Start/stop metronome
- **Tempo knob**: Drag to adjust tempo (10-400 BPM)
- **+/- buttons**: Increment/decrement tempo by 1 BPM
- **Tap Tempo button**: Tap to set tempo
- **Add Polyrhythm button**: Add new polyrhythm track

### Track Controls
- **Reference track mute (M)**: Mute entire reference track
- **Volume sliders**: Adjust individual track volumes
- **Ratio dropdowns**: Change polyrhythm ratios (triggers resync)
- **Track mute/solo/remove**: Standard track controls for polyrhythms
- **Beat dots**: Click to mute/unmute individual beats

### Visual Indicators
- **Beat dots**: Show current beat position with orange highlighting
- **Downbeats**: Slightly orange background when inactive (70% opacity)
- **Active beats**: Orange background with glow effect
- **Muted beats**: Grey background and border with reduced opacity
- **Muted active beats**: Grey background with grey glow

## Audio Files

The application uses `sounds/woodblock.ogg` for metronome clicks. The BufferLoader handles loading and decoding this audio file for Web Audio API playback. Both reference and polyrhythm tracks use the same audio file with different pitch modulation.

## Responsive Design

- **Desktop**: Horizontal layout with reference track and transport side-by-side
- **Mobile**: Vertical stacking with grid-based transport layout
- **Polyrhythm tracks**: Stack vertically on mobile with beat indicators moved to bottom