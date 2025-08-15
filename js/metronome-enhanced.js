var AudioContext = window.AudioContext || window.webkitAudioContext;
var audioContext = new AudioContext();

import { BufferLoader } from './buffer-loader.js';
import { KnobControl } from './components/knob-control.js';
import { LEDDisplay } from './components/led-display.js';
import { PolyrhythmTrack } from './components/polyrhythm-track.js';

class MetronomePro {
  constructor() {
    this.isPlaying = false;
    this.lookahead = 25.0;
    this.scheduleAheadTime = 0.1;
    this.nextTickTime = 0.0;
    this.gainNode = null;
    this.tempo = 120;
    this.worker = null;
    this.woodblock = null;
    this.volume = 0.8;
    
    // Polyrhythm tracks
    this.tracks = new Map();
    this.nextTrackId = 1;
    this.masterTick = 0;
    
    // Tap tempo
    this.tapTempoBuffer = [];
    this.timer = undefined;
    this.tapTimerTimeout = 2000;
    
    // UI Components
    this.components = {};
    
    this.init();
  }

  async init() {
    console.log("Initializing Metronome Pro...");
    
    // Initialize Audio
    this.gainNode = audioContext.createGain();
    this.gainNode.gain.value = this.volume;
    this.worker = new Worker('js/worker.js');
    
    // Load sounds
    await this.initSounds();
    
    // Initialize UI components
    this.initComponents();
    
    // Bind events
    this.bindEvents();
    
    // Setup worker
    this.worker.onmessage = (e) => {
      if (e.data == "tick") {
        this.scheduler();
      } else {
        console.log("message: " + e.data);
      }
    };
    
    this.worker.postMessage({"interval": this.lookahead});
    
    console.log("Metronome Pro initialized!");
  }

  initSounds() {
    return new Promise((resolve) => {
      const bufferLoader = new BufferLoader(audioContext, ["sounds/woodblock.ogg"], (bufferList) => {
        this.woodblock = bufferList[0];
        resolve();
      });
      bufferLoader.load();
    });
  }

  initComponents() {
    // Tempo Knob
    this.components.tempoKnob = new KnobControl(
      document.getElementById('tempo-knob'),
      {
        min: 10,
        max: 400,
        value: this.tempo,
        step: 1,
        label: 'Tempo',
        unit: 'BPM',
        size: 60,
        sensitivity: 0.3
      }
    );

    // Tempo Display
    this.components.tempoDisplay = new LEDDisplay(
      document.getElementById('tempo-display'),
      {
        digits: 3,
        label: 'BPM',
        fontSize: '20px'
      }
    );

    // Set initial values
    this.updateDisplays();
    
    // Add initial polyrhythm track
    this.addTrack();
  }

  bindEvents() {
    // Tempo knob
    this.components.tempoKnob.on('change', (value) => {
      this.tempo = value;
      this.updateDisplays();
    });

    // Transport buttons
    document.getElementById('toggle-button').addEventListener('click', () => {
      this.toggle();
    });

    document.getElementById('reset-button').addEventListener('click', () => {
      this.reset();
    });

    // Tempo buttons
    document.getElementById('tempo-down-button').addEventListener('click', () => {
      this.adjustTempo(-1);
    });

    document.getElementById('tempo-up-button').addEventListener('click', () => {
      this.adjustTempo(1);
    });

    // Tap tempo button
    document.getElementById('tap-tempo-button').addEventListener('click', () => {
      this.handleTapTempo();
    });

    // Add track button
    document.getElementById('add-track-button').addEventListener('click', () => {
      this.addTrack();
    });

    // Keyboard shortcuts
    document.addEventListener('keydown', (e) => {
      if (e.code === 'Space') {
        e.preventDefault();
        this.toggle();
      } else if (e.code === 'KeyT') {
        e.preventDefault();
        this.handleTapTempo();
      } else if (e.code === 'KeyR') {
        e.preventDefault();
        this.reset();
      } else if (e.code === 'ArrowUp') {
        e.preventDefault();
        this.adjustTempo(1);
      } else if (e.code === 'ArrowDown') {
        e.preventDefault();
        this.adjustTempo(-1);
      }
    });
  }

  async toggle() {
    // Resume audio context if needed
    if (audioContext.state === 'suspended') {
      await audioContext.resume();
    }
    
    this.isPlaying = !this.isPlaying;
    
    const button = document.getElementById('toggle-button');
    const icon = document.getElementById('play-icon');
    
    if (this.isPlaying) {
      console.log('Starting metronome, tracks:', this.tracks.size);
      this.nextTickTime = audioContext.currentTime;
      this.masterTick = 0;
      this.worker.postMessage("start");
      icon.textContent = "⏸";
      button.classList.add('playing');
    } else {
      console.log('Stopping metronome');
      this.resetPlayback();
      this.worker.postMessage("stop");
      icon.textContent = "▶";
      button.classList.remove('playing');
    }
  }

  reset() {
    if (this.isPlaying) {
      this.toggle();
    }
    this.resetPlayback();
  }

  resetPlayback() {
    this.masterTick = 0;
    this.tracks.forEach(track => {
      track.component.updateBeat(0, 0);
    });
  }

  adjustTempo(delta) {
    this.tempo = Math.max(10, Math.min(400, this.tempo + delta));
    this.components.tempoKnob.setValue(this.tempo);
    this.updateDisplays();
  }

  handleTapTempo() {
    const currentTime = Date.now();
    clearTimeout(this.timer);
    const nextIndex = this.tapTempoBuffer.length;

    if (this.timer === undefined) {
      this.timer = setTimeout(() => this.resetTapTempo(), this.tapTimerTimeout);
      this.tapTempoBuffer[nextIndex] = currentTime;
    } else {
      this.timer = setTimeout(() => this.resetTapTempo(), this.tapTimerTimeout);

      if (this.tapTempoBuffer.length > 3) {
        this.tapTempoBuffer.shift();
        this.calculateTempo();
      }

      this.tapTempoBuffer.push(currentTime);
    }
  }

  resetTapTempo() {
    this.timer = undefined;
    this.tapTempoBuffer = [];
  }

  calculateTempo() {
    let averageTime = 0;
    for (let i = 0; i < this.tapTempoBuffer.length - 1; i++) {
      averageTime += this.tapTempoBuffer[i + 1] - this.tapTempoBuffer[i];
    }

    averageTime /= this.tapTempoBuffer.length - 1;
    this.tempo = Math.round(60000 / averageTime);
    this.components.tempoKnob.setValue(this.tempo);
    this.updateDisplays();
  }

  addTrack() {
    console.log('Adding track...');
    const trackId = this.nextTrackId++;
    const container = document.getElementById('tracks-container');
    
    if (!container) {
      console.error('tracks-container not found');
      return;
    }
    
    const trackElement = document.createElement('div');
    container.appendChild(trackElement);
    
    const trackComponent = new PolyrhythmTrack(trackElement, {
      id: trackId,
      beats: 4,
      subdivision: 1
    });
    
    // Bind track events
    trackComponent.on('patternChange', (data) => {
      this.updateTrackPattern(data.trackId, data.beats, data.subdivision);
    });
    
    trackComponent.on('volumeChange', (data) => {
      this.updateTrackVolume(data.trackId, data.volume);
    });
    
    trackComponent.on('muteChange', (data) => {
      this.updateTrackMute(data.trackId, data.muted);
    });
    
    trackComponent.on('soloChange', (data) => {
      this.updateTrackSolo(data.trackId, data.solo);
    });
    
    trackComponent.on('removeTrack', (data) => {
      this.removeTrack(data.trackId);
    });
    
    // Store track data
    this.tracks.set(trackId, {
      component: trackComponent,
      beats: 4,
      subdivision: 1,
      volume: 80,
      muted: false,
      solo: false,
      currentBeat: 0,
      currentSubdivision: 0
    });
    
    console.log(`Track ${trackId} added. Total tracks: ${this.tracks.size}`);
  }

  removeTrack(trackId) {
    const track = this.tracks.get(trackId);
    if (track) {
      this.tracks.delete(trackId);
    }
  }

  updateTrackPattern(trackId, beats, subdivision) {
    const track = this.tracks.get(trackId);
    if (track) {
      track.beats = beats;
      track.subdivision = subdivision;
    }
  }

  updateTrackVolume(trackId, volume) {
    const track = this.tracks.get(trackId);
    if (track) {
      track.volume = volume;
    }
  }

  updateTrackMute(trackId, muted) {
    const track = this.tracks.get(trackId);
    if (track) {
      track.muted = muted;
    }
  }

  updateTrackSolo(trackId, solo) {
    const track = this.tracks.get(trackId);
    if (track) {
      track.solo = solo;
    }
  }

  nextTick() {
    // Use smallest subdivision as master tick (16th notes for precision)
    this.nextTickTime += 60.0 / (this.tempo * 4);
    this.masterTick++;
    
    // Update each track
    this.tracks.forEach((track, trackId) => {
      const ticksPerBeat = 4 / track.subdivision;
      const ticksPerPattern = track.beats * ticksPerBeat;
      
      const patternTick = this.masterTick % ticksPerPattern;
      const beat = Math.floor(patternTick / ticksPerBeat);
      const subdivision = patternTick % ticksPerBeat;
      
      track.currentBeat = beat;
      track.currentSubdivision = subdivision;
      track.component.updateBeat(beat, subdivision);
    });
  }

  scheduleTick(time) {
    if (!this.woodblock || this.tracks.size === 0) return;
    
    // Check if any solo tracks are active
    const soloTracks = Array.from(this.tracks.values()).filter(track => track.solo);
    const activeTracks = soloTracks.length > 0 ? soloTracks : Array.from(this.tracks.values()).filter(track => !track.muted);
    
    activeTracks.forEach((track, index) => {
      const ticksPerBeat = 4 / track.subdivision;
      const ticksPerPattern = track.beats * ticksPerBeat;
      const patternTick = this.masterTick % ticksPerPattern;
      
      // Only play on subdivision boundaries
      if (patternTick % ticksPerBeat === 0) {
        try {
          const source = audioContext.createBufferSource();
          source.buffer = this.woodblock;
          
          const gainNode = audioContext.createGain();
          const volume = (track.volume / 100) * this.volume;
          
          // Emphasize downbeats
          if (patternTick === 0) {
            gainNode.gain.setValueAtTime(volume, time);
            source.playbackRate.value = 1.2;
          } else {
            gainNode.gain.setValueAtTime(volume * 0.7, time);
            source.playbackRate.value = 1.0;
          }
          
          source.connect(gainNode);
          gainNode.connect(audioContext.destination);
          source.start(time);
        } catch (error) {
          console.error('Error scheduling tick:', error);
        }
      }
    });
  }

  scheduler() {
    while (this.nextTickTime < audioContext.currentTime + this.scheduleAheadTime) {
      this.scheduleTick(this.nextTickTime);
      this.nextTick();
    }
  }

  updateDisplays() {
    this.components.tempoDisplay.setValue(this.tempo);
  }
}

// Initialize when page loads
window.addEventListener("load", () => {
  new MetronomePro();
});