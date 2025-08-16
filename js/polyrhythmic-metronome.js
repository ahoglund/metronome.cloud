var AudioContext = window.AudioContext || window.webkitAudioContext;
var audioContext = new AudioContext();

import { BufferLoader } from './buffer-loader.js';

class PolyrhythmicMetronome {
  constructor() {
    this.isPlaying = false;
    this.lookahead = 25.0;
    this.scheduleAheadTime = 0.1;
    this.nextTickTime = 0.0;
    this.tempo = 120;
    this.worker = null;
    this.sounds = {};
    this.volume = 0.8;
    
    this.referenceTrack = {
      beats: 4,
      currentBeat: 0,
      nextBeatTime: 0,
      nextCycleStartTime: 0,
      mutedBeats: new Array(4).fill(false)
    };
    
    // Polyrhythms array
    this.polyrhythms = [];
    this.nextPolyrhythmId = 1;
    this.masterTick = 0;
    
    // Available pitches for polyrhythms (excluding 1.0 which is used by reference track)
    this.pitches = [1.2, 0.8, 1.5, 0.67, 1.33, 0.75, 1.25, 1.1];
    
    // Tap tempo
    this.tapTempoBuffer = [];
    this.tapTimer = undefined;
    this.tapTimerTimeout = 2000;
    
    this.init();
  }

  async init() {
    console.log("Initializing Polyrhythmic Metronome...");
    
    // Load multiple pitched sounds
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
    
    // Create reference track UI
    this.createReferenceTrack();
    
    console.log("Polyrhythmic Metronome initialized!");
  }

  loadSounds() {
    return new Promise((resolve) => {
      // For now, we'll use the same sound file and pitch-shift it
      const bufferLoader = new BufferLoader(audioContext, ["sounds/woodblock.ogg"], (bufferList) => {
        this.sounds.reference = bufferList[0];
        this.sounds.polyrhythm = bufferList[0]; // Same sound, different pitches
        console.log("Sounds loaded");
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

    document.getElementById('add-polyrhythm-button').addEventListener('click', () => {
      this.addPolyrhythm();
    });

    document.getElementById('tap-tempo-button').addEventListener('click', () => {
      this.handleTapTempo();
    });

    // Keyboard shortcuts
    document.addEventListener('keydown', (e) => {
      if (e.code === 'Space') {
        e.preventDefault();
        this.toggle();
      } else if (e.code === 'KeyT') {
        e.preventDefault();
        this.handleTapTempo();
      }
    });
  }

  createReferenceTrack() {
    const container = document.getElementById('reference-track');
    if (!container) return;
    
    container.innerHTML = `
      <div class="reference-track-display">
        <div class="track-info">
          <div class="track-tempo">${this.tempo} BPM</div>
        </div>
        <div class="track-visualizer">
          <div class="beat-dots reference-dots">
            <div class="beat-dot downbeat" data-beat="0"></div>
            <div class="beat-dot" data-beat="1"></div>
            <div class="beat-dot" data-beat="2"></div>
            <div class="beat-dot" data-beat="3"></div>
          </div>
        </div>
        <div class="track-controls">
          <button class="track-mute" id="reference-mute">M</button>
          <div class="track-volume">
            <label>Vol</label>
            <input type="range" id="reference-volume" min="0" max="100" value="100">
            <span class="volume-value">100</span>
          </div>
        </div>
      </div>
    `;
    
    // Add volume control
    const volumeSlider = container.querySelector('#reference-volume');
    const volumeValue = container.querySelector('.volume-value');
    
    volumeSlider.addEventListener('input', (e) => {
      const volume = parseInt(e.target.value);
      volumeValue.textContent = volume;
      this.referenceTrack.volume = volume;
    });
    
    // Add mute control
    const muteButton = container.querySelector('#reference-mute');
    muteButton.addEventListener('click', () => {
      this.referenceTrack.muted = !this.referenceTrack.muted;
      muteButton.classList.toggle('active', this.referenceTrack.muted);
    });
    
    this.referenceTrack.volume = 100;
    this.referenceTrack.muted = false;
    
    // Add beat mute functionality
    const beatDots = container.querySelectorAll('.beat-dot');
    beatDots.forEach((dot, index) => {
      dot.addEventListener('click', () => {
        this.toggleReferenceBeatMute(index);
      });
    });
    
    console.log('Reference track created:', this.referenceTrack);
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
      const range = 400 - 10;
      const normalized = (this.tempo - 10) / range;
      const rotation = normalized * 270 - 135;
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
        this.resyncAfterTempoChange();
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

  async toggle() {
    if (audioContext.state === 'suspended') {
      await audioContext.resume();
    }
    
    this.isPlaying = !this.isPlaying;
    
    const button = document.getElementById('toggle-button');
    const icon = document.getElementById('play-icon');
    
    if (this.isPlaying) {
      console.log('Starting polyrhythmic metronome');
      this.nextTickTime = audioContext.currentTime;
      this.masterTick = 0;
      this.referenceTrack.currentBeat = 0;
      this.referenceTrack.nextBeatTime = this.nextTickTime;
      this.referenceTrack.nextCycleStartTime = this.nextTickTime;
      
      // Reset all polyrhythm positions
      this.polyrhythms.forEach(poly => {
        poly.currentBeat = 0;
        poly.nextBeatTime = this.nextTickTime;
      });
      
      this.worker.postMessage("start");
      icon.textContent = "⏸";
    } else {
      console.log('Stopping metronome');
      this.worker.postMessage("stop");
      icon.textContent = "▶";
      this.resetVisualizers();
    }
  }

  adjustTempo(delta) {
    this.tempo = Math.max(10, Math.min(400, this.tempo + delta));
    this.updateTempoDisplay();
    this.updateKnobRotation();
    this.resyncAfterTempoChange();
  }

  updateKnobRotation() {
    const knobHandle = document.querySelector('#tempo-knob .knob-handle');
    if (knobHandle) {
      const range = 400 - 10;
      const normalized = (this.tempo - 10) / range;
      const rotation = normalized * 270 - 135;
      knobHandle.style.transform = `rotate(${rotation}deg)`;
    }
  }

  updateTempoDisplay() {
    const tempoText = document.querySelector('#tempo-display .led-text');
    if (tempoText) {
      tempoText.textContent = this.tempo;
    }
    
    const knobValue = document.querySelector('#tempo-knob .knob-value');
    if (knobValue) {
      knobValue.textContent = `${this.tempo} BPM`;
    }
    
    // Update reference track tempo display
    const referenceTempo = document.querySelector('.reference-track-display .track-tempo');
    if (referenceTempo) {
      referenceTempo.textContent = `${this.tempo} BPM`;
    }
  }

  addPolyrhythm() {
    const polyrhythmId = this.nextPolyrhythmId++;
    const container = document.getElementById('polyrhythms-container');
    
    if (!container) {
      console.error('polyrhythms-container not found');
      return;
    }
    
    const pitchIndex = (polyrhythmId - 1) % this.pitches.length;
    const pitch = this.pitches[pitchIndex];
    
    // Default polyrhythm values
    const beats = 3; // 3 against 4
    
    const polyrhythmElement = document.createElement('div');
    polyrhythmElement.className = 'polyrhythm-track';
    polyrhythmElement.innerHTML = `
      <div class="track-header">
        <div class="track-controls">
          <button class="track-mute" data-poly="${polyrhythmId}">M</button>
          <button class="track-solo" data-poly="${polyrhythmId}">S</button>
          <button class="track-remove" data-poly="${polyrhythmId}">×</button>
        </div>
        <div class="track-label">Polyrhythm ${beats}:4</div>
      </div>
      <div class="track-body">
        <div class="track-pattern">
          <label>Ratio</label>
          <select class="beats-select" data-poly="${polyrhythmId}">
            <option value="2">2:4</option>
            <option value="3" selected>3:4</option>
            <option value="5">5:4</option>
            <option value="6">6:4</option>
            <option value="7">7:4</option>
            <option value="8">8:4</option>
            <option value="9">9:4</option>
            <option value="10">10:4</option>
            <option value="11">11:4</option>
            <option value="12">12:4</option>
            <option value="13">13:4</option>
            <option value="14">14:4</option>
            <option value="15">15:4</option>
            <option value="16">16:4</option>
          </select>
        </div>
        <div class="track-volume">
          <label>Vol</label>
          <input type="range" class="volume-slider" data-poly="${polyrhythmId}" min="0" max="100" value="80">
          <span class="volume-value">80</span>
        </div>
        <div class="track-visualizer">
          <div class="beat-dots polyrhythm-dots" data-poly="${polyrhythmId}">
            ${Array.from({length: beats}, (_, i) => 
              `<div class="beat-dot ${i === 0 ? 'downbeat' : ''}" data-beat="${i}"></div>`
            ).join('')}
          </div>
        </div>
      </div>
    `;
    
    container.appendChild(polyrhythmElement);
    
    // Add event listeners
    polyrhythmElement.querySelector('.track-remove').addEventListener('click', () => {
      this.removePolyrhythm(polyrhythmId);
    });
    
    polyrhythmElement.querySelector('.track-mute').addEventListener('click', () => {
      this.togglePolyrhythmMute(polyrhythmId);
    });
    
    polyrhythmElement.querySelector('.track-solo').addEventListener('click', () => {
      this.togglePolyrhythmSolo(polyrhythmId);
    });
    
    polyrhythmElement.querySelector('.beats-select').addEventListener('change', (e) => {
      this.updatePolyrhythmBeats(polyrhythmId, parseInt(e.target.value));
    });
    
    const volumeSlider = polyrhythmElement.querySelector('.volume-slider');
    const volumeValue = polyrhythmElement.querySelector('.volume-value');
    
    volumeSlider.addEventListener('input', (e) => {
      const volume = parseInt(e.target.value);
      volumeValue.textContent = volume;
      this.updatePolyrhythmVolume(polyrhythmId, volume);
    });
    
    // Calculate synchronized start time
    let nextBeatTime = 0;
    let currentBeat = 0;
    
    if (this.isPlaying) {
      // Always start polyrhythms at the beginning of the next reference cycle
      nextBeatTime = this.referenceTrack.nextCycleStartTime;
      currentBeat = 0;
      
      console.log(`Syncing polyrhythm to next cycle start at ${nextBeatTime.toFixed(3)}`);
    }

    // Store polyrhythm data
    const polyrhythm = {
      id: polyrhythmId,
      element: polyrhythmElement,
      beats: beats,
      volume: 80,
      muted: false,
      solo: false,
      currentBeat: currentBeat,
      nextBeatTime: nextBeatTime,
      pitch: pitch,
      mutedBeats: new Array(beats).fill(false)
    };
    
    this.polyrhythms.push(polyrhythm);
    
    // Add beat mute functionality to polyrhythm
    const polyBeatDots = polyrhythmElement.querySelectorAll('.beat-dot');
    polyBeatDots.forEach((dot, index) => {
      dot.addEventListener('click', () => {
        this.togglePolyrhythmBeatMute(polyrhythmId, index);
      });
    });
    
    console.log(`Polyrhythm ${beats}:4 added. Total polyrhythms: ${this.polyrhythms.length}`);
  }

  removePolyrhythm(polyrhythmId) {
    const index = this.polyrhythms.findIndex(p => p.id === polyrhythmId);
    if (index >= 0) {
      this.polyrhythms[index].element.remove();
      this.polyrhythms.splice(index, 1);
      console.log(`Polyrhythm ${polyrhythmId} removed`);
    }
  }

  updatePolyrhythmBeats(polyrhythmId, beats) {
    const polyrhythm = this.polyrhythms.find(p => p.id === polyrhythmId);
    if (polyrhythm) {
      polyrhythm.beats = beats;
      
      // Resize mutedBeats array to match new beat count
      const oldMutedBeats = polyrhythm.mutedBeats || [];
      polyrhythm.mutedBeats = new Array(beats).fill(false);
      // Copy over existing mute states up to the minimum of old/new length
      for (let i = 0; i < Math.min(oldMutedBeats.length, beats); i++) {
        polyrhythm.mutedBeats[i] = oldMutedBeats[i];
      }
      
      // If playing, reset to start at next reference cycle
      if (this.isPlaying) {
        polyrhythm.currentBeat = 0;
        polyrhythm.nextBeatTime = this.referenceTrack.nextCycleStartTime;
        console.log(`Resetting polyrhythm ${polyrhythmId} to sync with next cycle at ${polyrhythm.nextBeatTime.toFixed(3)}`);
      }
      
      // Update label
      const label = polyrhythm.element.querySelector('.track-label');
      label.textContent = `Polyrhythm ${beats}:4`;
      
      // Update visualizer
      this.updatePolyrhythmVisualizer(polyrhythmId);
    }
  }

  updatePolyrhythmVisualizer(polyrhythmId) {
    const polyrhythm = this.polyrhythms.find(p => p.id === polyrhythmId);
    if (!polyrhythm) return;
    
    const visualizer = polyrhythm.element.querySelector('.beat-dots');
    visualizer.innerHTML = '';
    
    for (let i = 0; i < polyrhythm.beats; i++) {
      const dot = document.createElement('div');
      dot.className = i === 0 ? 'beat-dot downbeat' : 'beat-dot';
      dot.setAttribute('data-beat', i);
      dot.addEventListener('click', () => {
        this.togglePolyrhythmBeatMute(polyrhythm.id, i);
      });
      if (polyrhythm.mutedBeats[i]) {
        dot.classList.add('muted');
      }
      visualizer.appendChild(dot);
    }
  }

  updatePolyrhythmVolume(polyrhythmId, volume) {
    const polyrhythm = this.polyrhythms.find(p => p.id === polyrhythmId);
    if (polyrhythm) {
      polyrhythm.volume = volume;
    }
  }

  togglePolyrhythmMute(polyrhythmId) {
    const polyrhythm = this.polyrhythms.find(p => p.id === polyrhythmId);
    if (polyrhythm) {
      polyrhythm.muted = !polyrhythm.muted;
      const muteButton = polyrhythm.element.querySelector('.track-mute');
      muteButton.classList.toggle('active', polyrhythm.muted);
    }
  }

  togglePolyrhythmSolo(polyrhythmId) {
    const polyrhythm = this.polyrhythms.find(p => p.id === polyrhythmId);
    if (polyrhythm) {
      polyrhythm.solo = !polyrhythm.solo;
      const soloButton = polyrhythm.element.querySelector('.track-solo');
      soloButton.classList.toggle('active', polyrhythm.solo);
    }
  }

  scheduler() {
    while (this.nextTickTime < audioContext.currentTime + this.scheduleAheadTime) {
      this.scheduleTick(this.nextTickTime);
      this.nextTick();
    }
  }

  scheduleTick(time) {
    const beatDuration = 60.0 / this.tempo;
    
    // Schedule reference track beats at regular intervals
    while (this.referenceTrack.nextBeatTime < time + this.scheduleAheadTime) {
      if (this.referenceTrack.nextBeatTime >= time) {
        if (!this.referenceTrack.muted && !this.referenceTrack.mutedBeats[this.referenceTrack.currentBeat]) {
          console.log('Scheduling reference beat at', this.referenceTrack.nextBeatTime);
          const isDownbeat = this.referenceTrack.currentBeat === 0;
          const pitch = isDownbeat ? 1.2 : 1.0;
          this.playSound(this.referenceTrack.nextBeatTime, this.sounds.reference, pitch, (this.referenceTrack.volume / 100) * this.volume);
        }
        this.updateReferenceDisplay();
      }
      
      this.referenceTrack.currentBeat = (this.referenceTrack.currentBeat + 1) % this.referenceTrack.beats;
      this.referenceTrack.nextBeatTime += beatDuration;
      
      // Update next cycle start time when we complete a cycle
      if (this.referenceTrack.currentBeat === 0) {
        this.referenceTrack.nextCycleStartTime = this.referenceTrack.nextBeatTime;
      }
    }
    
    // Schedule polyrhythm beats
    this.polyrhythms.forEach(polyrhythm => {
      const polyrhythmBeatDuration = (beatDuration * this.referenceTrack.beats) / polyrhythm.beats;
      
      while (polyrhythm.nextBeatTime < time + this.scheduleAheadTime) {
        if (polyrhythm.nextBeatTime >= time && !polyrhythm.muted && !polyrhythm.mutedBeats[polyrhythm.currentBeat]) {
          // Check solo logic
          const soloedPolyrhythms = this.polyrhythms.filter(p => p.solo);
          if (soloedPolyrhythms.length === 0 || polyrhythm.solo) {
            console.log('Scheduling polyrhythm beat at', polyrhythm.nextBeatTime);
            const isDownbeat = polyrhythm.currentBeat === 0;
            const pitch = isDownbeat ? polyrhythm.pitch * 1.2 : polyrhythm.pitch;
            this.playSound(polyrhythm.nextBeatTime, this.sounds.polyrhythm, pitch, (polyrhythm.volume / 100) * this.volume);
          }
          this.updatePolyrhythmDisplay(polyrhythm);
        }
        
        polyrhythm.currentBeat = (polyrhythm.currentBeat + 1) % polyrhythm.beats;
        polyrhythm.nextBeatTime += polyrhythmBeatDuration;
      }
    });
  }

  nextTick() {
    // Advance time by lookahead interval
    this.nextTickTime += this.lookahead / 1000.0;
  }

  playSound(time, buffer, pitch, volume) {
    try {
      const source = audioContext.createBufferSource();
      source.buffer = buffer;
      
      const gainNode = audioContext.createGain();
      gainNode.gain.setValueAtTime(volume * this.volume, time);
      
      source.playbackRate.value = pitch;
      
      source.connect(gainNode);
      gainNode.connect(audioContext.destination);
      source.start(time);
    } catch (error) {
      console.error('Error playing sound:', error);
    }
  }

  updateReferenceDisplay() {
    const dots = document.querySelectorAll('.reference-dots .beat-dot');
    dots.forEach((dot, index) => {
      dot.classList.remove('active');
      if (index === this.referenceTrack.currentBeat) {
        dot.classList.add('active');
      }
    });
  }

  updatePolyrhythmDisplay(polyrhythm) {
    const dots = polyrhythm.element.querySelectorAll('.beat-dot');
    dots.forEach((dot, index) => {
      dot.classList.remove('active');
      if (index === polyrhythm.currentBeat) {
        dot.classList.add('active');
      }
    });
  }

  resetVisualizers() {
    // Reset reference track
    const referenceDots = document.querySelectorAll('.reference-dots .beat-dot');
    referenceDots.forEach(dot => dot.classList.remove('active'));
    
    // Reset polyrhythms
    this.polyrhythms.forEach(polyrhythm => {
      const dots = polyrhythm.element.querySelectorAll('.beat-dot');
      dots.forEach(dot => dot.classList.remove('active'));
    });
  }

  handleTapTempo() {
    const currentTime = Date.now();
    clearTimeout(this.tapTimer);

    if (this.tapTimer === undefined) {
      this.tapTimer = setTimeout(() => this.resetTapTempo(), this.tapTimerTimeout);
      this.tapTempoBuffer = [currentTime];
      console.log('Started tap tempo');
    } else {
      this.tapTimer = setTimeout(() => this.resetTapTempo(), this.tapTimerTimeout);

      if (this.tapTempoBuffer.length > 3) {
        this.tapTempoBuffer.shift();
      }

      this.tapTempoBuffer.push(currentTime);

      if (this.tapTempoBuffer.length >= 2) {
        this.calculateTapTempo();
      }
    }
  }

  resetTapTempo() {
    this.tapTimer = undefined;
    this.tapTempoBuffer = [];
    console.log('Reset tap tempo');
  }

  calculateTapTempo() {
    if (this.tapTempoBuffer.length < 2) return;

    let averageTime = 0;
    for (let i = 0; i < this.tapTempoBuffer.length - 1; i++) {
      averageTime += this.tapTempoBuffer[i + 1] - this.tapTempoBuffer[i];
    }

    averageTime /= this.tapTempoBuffer.length - 1;
    const newTempo = Math.round(60000 / averageTime);
    
    if (newTempo >= 10 && newTempo <= 400) {
      this.tempo = newTempo;
      this.updateTempoDisplay();
      this.updateKnobRotation();
      this.resyncAfterTempoChange();
      console.log('Tap tempo calculated:', newTempo);
    }
  }

  resyncAfterTempoChange() {
    if (!this.isPlaying) return;
    
    const currentTime = audioContext.currentTime;
    const newBeatDuration = 60.0 / this.tempo;
    
    // Simple approach: schedule next beats for all tracks to happen very soon
    // but maintain their current beat positions within their cycles
    const syncTime = currentTime + 0.1; // 100ms from now
    
    // Resync reference track - keep current beat position, just adjust timing
    this.referenceTrack.nextBeatTime = syncTime;
    
    // Update next cycle time 
    const beatsUntilCycle = this.referenceTrack.beats - this.referenceTrack.currentBeat;
    this.referenceTrack.nextCycleStartTime = syncTime + ((beatsUntilCycle - 1) * newBeatDuration);
    
    // Resync all polyrhythms - they'll sync to the next reference cycle
    this.polyrhythms.forEach(polyrhythm => {
      // Reset polyrhythms to start of their cycle and sync with next reference cycle
      polyrhythm.currentBeat = 0;
      polyrhythm.nextBeatTime = this.referenceTrack.nextCycleStartTime;
    });
    
    console.log('Resynced all tracks after tempo change to', this.tempo, 'BPM');
  }

  toggleReferenceBeatMute(beatIndex) {
    this.referenceTrack.mutedBeats[beatIndex] = !this.referenceTrack.mutedBeats[beatIndex];
    
    // Update visual indicator
    const beatDot = document.querySelector(`.reference-dots .beat-dot[data-beat="${beatIndex}"]`);
    if (beatDot) {
      beatDot.classList.toggle('muted', this.referenceTrack.mutedBeats[beatIndex]);
    }
    
    console.log(`Reference beat ${beatIndex} ${this.referenceTrack.mutedBeats[beatIndex] ? 'muted' : 'unmuted'}`);
  }

  togglePolyrhythmBeatMute(polyrhythmId, beatIndex) {
    const polyrhythm = this.polyrhythms.find(p => p.id === polyrhythmId);
    if (!polyrhythm) return;
    
    polyrhythm.mutedBeats[beatIndex] = !polyrhythm.mutedBeats[beatIndex];
    
    // Update visual indicator
    const beatDot = polyrhythm.element.querySelector(`.beat-dot[data-beat="${beatIndex}"]`);
    if (beatDot) {
      beatDot.classList.toggle('muted', polyrhythm.mutedBeats[beatIndex]);
    }
    
    console.log(`Polyrhythm ${polyrhythmId} beat ${beatIndex} ${polyrhythm.mutedBeats[beatIndex] ? 'muted' : 'unmuted'}`);
  }
}

// Initialize when page loads
window.addEventListener("load", () => {
  new PolyrhythmicMetronome();
});
