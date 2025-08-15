var AudioContext = window.AudioContext || window.webkitAudioContext;
var audioContext = new AudioContext();

import { BufferLoader } from './buffer-loader.js';

class SimpleMetronome {
  constructor() {
    this.isPlaying = false;
    this.lookahead = 25.0;
    this.scheduleAheadTime = 0.1;
    this.nextTickTime = 0.0;
    this.tempo = 120;
    this.worker = null;
    this.woodblock = null;
    this.volume = 0.8;
    this.tracks = [];
    this.nextTrackId = 1;
    this.masterTick = 0;
    
    this.init();
  }

  async init() {
    console.log("Initializing Simple Metronome...");
    
    // Load sounds
    await this.loadSounds();
    
    // Initialize UI
    this.setupUI();
    
    // Setup worker
    this.worker = new Worker('js/worker.js');
    this.worker.onmessage = (e) => {
      if (e.data == "tick") {
        this.scheduler();
      }
    };
    this.worker.postMessage({"interval": this.lookahead});
    
    // Add default track
    this.addTrack();
    
    console.log("Simple Metronome initialized!");
  }

  loadSounds() {
    return new Promise((resolve) => {
      const bufferLoader = new BufferLoader(audioContext, ["sounds/woodblock.ogg"], (bufferList) => {
        this.woodblock = bufferList[0];
        console.log("Sound loaded");
        resolve();
      });
      bufferLoader.load();
    });
  }

  setupUI() {
    // Setup tempo knob
    this.setupTempoKnob();
    
    // Tempo display
    const tempoDisplay = document.getElementById('tempo-display');
    if (tempoDisplay) {
      tempoDisplay.innerHTML = `<div class="led-screen"><span class="led-text">${this.tempo}</span></div><div class="led-label">BPM</div>`;
    }

    // Transport buttons
    document.getElementById('toggle-button').addEventListener('click', () => {
      this.toggle();
    });

    document.getElementById('tempo-down-button').addEventListener('click', () => {
      this.adjustTempo(-1);
    });

    document.getElementById('tempo-up-button').addEventListener('click', () => {
      this.adjustTempo(1);
    });

    document.getElementById('add-track-button').addEventListener('click', () => {
      this.addTrack();
    });

    // Keyboard shortcuts
    document.addEventListener('keydown', (e) => {
      if (e.code === 'Space') {
        e.preventDefault();
        this.toggle();
      }
    });
  }

  async toggle() {
    if (audioContext.state === 'suspended') {
      await audioContext.resume();
    }
    
    this.isPlaying = !this.isPlaying;
    
    const button = document.getElementById('toggle-button');
    const icon = document.getElementById('play-icon');
    
    if (this.isPlaying) {
      console.log('Starting metronome, tracks:', this.tracks.length);
      this.nextTickTime = audioContext.currentTime;
      this.masterTick = 0;
      this.worker.postMessage("start");
      icon.textContent = "⏸";
    } else {
      console.log('Stopping metronome');
      this.worker.postMessage("stop");
      icon.textContent = "▶";
    }
  }

  reset() {
    if (this.isPlaying) {
      this.toggle();
    }
    this.masterTick = 0;
  }

  adjustTempo(delta) {
    this.tempo = Math.max(10, Math.min(400, this.tempo + delta));
    this.updateTempoDisplay();
    this.updateKnobRotation();
  }

  updateKnobRotation() {
    const knobHandle = document.querySelector('#tempo-knob .knob-handle');
    if (knobHandle) {
      const range = 400 - 10; // max - min
      const normalized = (this.tempo - 10) / range;
      const rotation = normalized * 270 - 135; // 270 degree range, starting at -135
      knobHandle.style.transform = `rotate(${rotation}deg)`;
    }
  }

  setupTempoKnob() {
    const knobContainer = document.getElementById('tempo-knob');
    if (!knobContainer) return;
    
    knobContainer.innerHTML = `
      <div class="knob-control">
        <div class="knob-container">
          <div class="knob-handle" style="width: 50px; height: 50px;">
            <div class="knob-indicator"></div>
          </div>
          <div class="knob-value">${this.tempo} BPM</div>
        </div>
        <label class="knob-label">Tempo</label>
      </div>
    `;
    
    const knobHandle = knobContainer.querySelector('.knob-handle');
    const knobValue = knobContainer.querySelector('.knob-value');
    let isDragging = false;
    let startY = 0;
    let startValue = this.tempo;
    
    const updateKnobRotation = () => {
      const range = 400 - 10; // max - min
      const normalized = (this.tempo - 10) / range;
      const rotation = normalized * 270 - 135; // 270 degree range, starting at -135
      knobHandle.style.transform = `rotate(${rotation}deg)`;
    };
    
    updateKnobRotation();
    
    knobHandle.addEventListener('mousedown', (e) => {
      isDragging = true;
      startY = e.clientY;
      startValue = this.tempo;
      knobContainer.classList.add('dragging');
      document.body.style.cursor = 'ns-resize';
      e.preventDefault();
    });
    
    document.addEventListener('mousemove', (e) => {
      if (!isDragging) return;
      
      const deltaY = startY - e.clientY;
      const sensitivity = 0.5;
      const range = 400 - 10;
      const delta = (deltaY * sensitivity * range) / 100;
      
      let newTempo = startValue + delta;
      newTempo = Math.max(10, Math.min(400, Math.round(newTempo)));
      
      if (newTempo !== this.tempo) {
        this.tempo = newTempo;
        knobValue.textContent = `${this.tempo} BPM`;
        updateKnobRotation();
        this.updateTempoDisplay();
      }
    });
    
    document.addEventListener('mouseup', () => {
      if (isDragging) {
        isDragging = false;
        knobContainer.classList.remove('dragging');
        document.body.style.cursor = '';
      }
    });
  }

  updateTempoDisplay() {
    const tempoText = document.querySelector('#tempo-display .led-text');
    if (tempoText) {
      tempoText.textContent = this.tempo;
    }
    
    // Update knob value too
    const knobValue = document.querySelector('#tempo-knob .knob-value');
    if (knobValue) {
      knobValue.textContent = `${this.tempo} BPM`;
    }
  }

  addTrack() {
    console.log('Adding track...');
    const trackId = this.nextTrackId++;
    const container = document.getElementById('tracks-container');
    
    if (!container) {
      console.error('tracks-container not found');
      return;
    }
    
    // Create simple track HTML
    const trackElement = document.createElement('div');
    trackElement.className = 'polyrhythm-track';
    trackElement.innerHTML = `
      <div class="track-header">
        <div class="track-controls">
          <button class="track-mute" data-track="${trackId}">M</button>
          <button class="track-solo" data-track="${trackId}">S</button>
          <button class="track-remove" data-track="${trackId}">×</button>
        </div>
        <div class="track-label">Track ${trackId}</div>
      </div>
      <div class="track-body">
        <div class="track-pattern">
          <label>Beats</label>
          <select class="beats-select" data-track="${trackId}">
            <option value="1">1</option>
            <option value="2">2</option>
            <option value="3">3</option>
            <option value="4" selected>4</option>
            <option value="5">5</option>
            <option value="6">6</option>
            <option value="7">7</option>
            <option value="8">8</option>
          </select>
        </div>
        <div class="track-subdivision">
          <label>Sub</label>
          <select class="subdivision-select" data-track="${trackId}">
            <option value="1" selected>1</option>
            <option value="2">2</option>
            <option value="3">3</option>
            <option value="4">4</option>
          </select>
        </div>
        <div class="track-volume">
          <label>Vol</label>
          <input type="range" class="volume-slider" data-track="${trackId}" min="0" max="100" value="80">
          <span class="volume-value">80</span>
        </div>
        <div class="track-visualizer">
          <div class="beat-dots" data-track="${trackId}">
            <div class="beat-dot downbeat"></div>
            <div class="beat-dot"></div>
            <div class="beat-dot"></div>
            <div class="beat-dot"></div>
          </div>
        </div>
      </div>
    `;
    
    container.appendChild(trackElement);
    
    // Add event listeners
    trackElement.querySelector('.track-remove').addEventListener('click', () => {
      this.removeTrack(trackId);
    });
    
    trackElement.querySelector('.track-mute').addEventListener('click', () => {
      this.toggleTrackMute(trackId);
    });
    
    trackElement.querySelector('.track-solo').addEventListener('click', () => {
      this.toggleTrackSolo(trackId);
    });
    
    trackElement.querySelector('.beats-select').addEventListener('change', (e) => {
      this.updateTrackBeats(trackId, parseInt(e.target.value));
    });
    
    // Store track data
    const track = {
      id: trackId,
      element: trackElement,
      beats: 4,
      subdivision: 1,
      volume: 80,
      muted: false,
      solo: false,
      currentBeat: 0
    };
    
    this.tracks.push(track);
    console.log(`Track ${trackId} added. Total tracks: ${this.tracks.length}`);
  }

  removeTrack(trackId) {
    console.log(`Removing track ${trackId}`);
    const trackIndex = this.tracks.findIndex(track => track.id === trackId);
    if (trackIndex >= 0) {
      const track = this.tracks[trackIndex];
      track.element.remove();
      this.tracks.splice(trackIndex, 1);
      
      // Reset track IDs to be sequential
      this.nextTrackId = this.tracks.length + 1;
    }
  }

  updateTrackBeats(trackId, beats) {
    const track = this.tracks.find(track => track.id === trackId);
    if (track) {
      track.beats = beats;
      this.updateTrackVisualizer(trackId);
    }
  }

  toggleTrackMute(trackId) {
    const track = this.tracks.find(track => track.id === trackId);
    if (track) {
      track.muted = !track.muted;
      const muteButton = track.element.querySelector('.track-mute');
      muteButton.classList.toggle('active', track.muted);
      console.log(`Track ${trackId} mute: ${track.muted}`);
    }
  }

  toggleTrackSolo(trackId) {
    const track = this.tracks.find(track => track.id === trackId);
    if (track) {
      track.solo = !track.solo;
      const soloButton = track.element.querySelector('.track-solo');
      soloButton.classList.toggle('active', track.solo);
      console.log(`Track ${trackId} solo: ${track.solo}`);
    }
  }

  updateTrackVisualizer(trackId) {
    const track = this.tracks.find(track => track.id === trackId);
    if (!track) return;
    
    const visualizer = track.element.querySelector('.beat-dots');
    visualizer.innerHTML = '';
    
    for (let i = 0; i < track.beats; i++) {
      const dot = document.createElement('div');
      dot.className = i === 0 ? 'beat-dot downbeat' : 'beat-dot';
      visualizer.appendChild(dot);
    }
  }

  scheduler() {
    while (this.nextTickTime < audioContext.currentTime + this.scheduleAheadTime) {
      this.scheduleTick(this.nextTickTime);
      this.nextTick();
    }
  }

  nextTick() {
    this.nextTickTime += 60.0 / (this.tempo * 4); // 16th note precision
    this.masterTick++;
    
    // Update each track
    this.tracks.forEach(track => {
      const beatsPerMeasure = track.beats;
      const ticksPerBeat = 4; // 16th notes per beat
      const ticksPerMeasure = beatsPerMeasure * ticksPerBeat;
      
      const measureTick = this.masterTick % ticksPerMeasure;
      const currentBeat = Math.floor(measureTick / ticksPerBeat);
      
      if (currentBeat !== track.currentBeat) {
        track.currentBeat = currentBeat;
        this.updateTrackDisplay(track);
      }
    });
  }

  updateTrackDisplay(track) {
    const dots = track.element.querySelectorAll('.beat-dot');
    dots.forEach((dot, index) => {
      dot.classList.remove('active');
      if (index === track.currentBeat) {
        dot.classList.add('active');
      }
    });
  }

  scheduleTick(time) {
    if (!this.woodblock || this.tracks.length === 0) return;
    
    // Check if any tracks are soloed
    const soloTracks = this.tracks.filter(track => track.solo);
    const activeTracks = soloTracks.length > 0 ? soloTracks : this.tracks.filter(track => !track.muted);
    
    activeTracks.forEach(track => {
      const beatsPerMeasure = track.beats;
      const ticksPerBeat = 4;
      const ticksPerMeasure = beatsPerMeasure * ticksPerBeat;
      
      const measureTick = this.masterTick % ticksPerMeasure;
      
      // Play on beat boundaries
      if (measureTick % ticksPerBeat === 0) {
        try {
          const source = audioContext.createBufferSource();
          source.buffer = this.woodblock;
          
          const gainNode = audioContext.createGain();
          const volume = (track.volume / 100) * this.volume;
          
          // Emphasize downbeat
          if (measureTick === 0) {
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
}

// Initialize when page loads
window.addEventListener("load", () => {
  new SimpleMetronome();
});