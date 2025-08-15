# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a web-based metronome application built with vanilla JavaScript, HTML, and CSS. The application uses the Web Audio API for precise timing and audio playback, providing features like customizable time signatures, subdivisions, tap tempo, and tempo controls.

## Architecture

The codebase follows a modular structure:

- **Main Application** (`js/metronome.js`): Core metronome logic using Web Audio API
  - Audio scheduling with precise timing using `scheduler()` function at js/metronome.js:77
  - Beat tracking and time signature management
  - UI event handling and state management
  - Tap tempo functionality with buffer averaging at js/metronome.js:164

- **Audio Buffer Management** (`js/buffer-loader.js`): Handles loading and decoding audio files
  - Asynchronous audio file loading with XMLHttpRequest
  - Audio buffer creation for Web Audio API

- **Timing Worker** (`js/worker.js`): Web Worker for consistent timing
  - Separate thread for metronome tick scheduling
  - Message-based communication with main thread

- **UI Layer** (`index.html` + `css/main.css`): Interface controls
  - Tempo slider and input controls
  - Time signature dropdowns (beats per bar, beat type)
  - Subdivision controls for complex rhythms

## Key Components

### Audio Scheduling
The application uses a sophisticated scheduling system:
- `lookahead` (25ms) and `scheduleAheadTime` (0.1s) for precise timing
- Web Worker sends "tick" messages at regular intervals
- Main thread schedules audio events ahead of time using `scheduleTick()` at js/metronome.js:57

### Beat Emphasis
Different beat types have different volumes and pitches:
- Downbeat (first beat): Full volume (1.0), higher pitch (1.2x)
- Strong beats: Half volume (0.5), normal pitch (1.0x)  
- Subdivisions: Low volume (0.1), lower pitch (0.8x)

### Tap Tempo
Implements tap tempo with averaging:
- Maintains buffer of recent tap intervals
- Calculates average timing for tempo determination
- Auto-resets after 2-second timeout

## Development

This is a static web application with no build process. To develop:

1. Serve files from a local web server (required for ES6 modules)
2. Open `index.html` in a browser
3. Test audio functionality (requires user interaction to start AudioContext)

## Controls

- **Space bar**: Start/stop metronome
- **T key**: Tap tempo input
- **+/- buttons**: Increment/decrement tempo
- **Dropdowns**: Configure time signature and subdivisions

## Audio Files

The application uses `sounds/woodblock.ogg` for metronome clicks. The BufferLoader handles loading and decoding this audio file for Web Audio API playback.