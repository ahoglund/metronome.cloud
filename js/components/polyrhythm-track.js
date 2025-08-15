import { BaseComponent } from './base-component.js';

export class PolyrhythmTrack extends BaseComponent {
  get defaultOptions() {
    return {
      id: 1,
      beats: 4,
      subdivision: 1,
      volume: 80,
      muted: false,
      solo: false,
      sound: 'click',
      color: '#ffffff'
    };
  }

  init() {
    this.beats = this.options.beats;
    this.subdivision = this.options.subdivision;
    this.volume = this.options.volume;
    this.muted = this.options.muted;
    this.solo = this.options.solo;
    this.currentBeat = 0;
    this.currentSubdivision = 0;
    super.init();
  }

  render() {
    this.element.className = 'polyrhythm-track';
    this.element.innerHTML = `
      <div class="track-header">
        <div class="track-controls">
          <button class="track-mute ${this.muted ? 'active' : ''}" data-action="mute">M</button>
          <button class="track-solo ${this.solo ? 'active' : ''}" data-action="solo">S</button>
          <button class="track-remove" data-action="remove">×</button>
        </div>
        <div class="track-label">Track ${this.options.id}</div>
      </div>
      
      <div class="track-body">
        <div class="track-pattern">
          <label>Beats</label>
          <select class="beats-select">
            ${Array.from({length: 16}, (_, i) => 
              `<option value="${i + 1}" ${i + 1 === this.beats ? 'selected' : ''}>${i + 1}</option>`
            ).join('')}
          </select>
        </div>
        
        <div class="track-subdivision">
          <label>Sub</label>
          <select class="subdivision-select">
            <option value="1" ${this.subdivision === 1 ? 'selected' : ''}>1</option>
            <option value="2" ${this.subdivision === 2 ? 'selected' : ''}>2</option>
            <option value="3" ${this.subdivision === 3 ? 'selected' : ''}>3</option>
            <option value="4" ${this.subdivision === 4 ? 'selected' : ''}>4</option>
          </select>
        </div>
        
        <div class="track-volume">
          <label>Vol</label>
          <input type="range" class="volume-slider" min="0" max="100" value="${this.volume}">
          <span class="volume-value">${this.volume}</span>
        </div>
        
        <div class="track-visualizer">
          <div class="beat-dots">
            ${Array.from({length: this.beats * this.subdivision}, (_, i) => {
              const beatIndex = Math.floor(i / this.subdivision);
              const isDownbeat = i % (this.beats * this.subdivision) === 0;
              const isStrongBeat = i % this.subdivision === 0;
              return `<div class="beat-dot ${isDownbeat ? 'downbeat' : isStrongBeat ? 'strong' : ''}" 
                           data-index="${i}"></div>`;
            }).join('')}
          </div>
        </div>
      </div>
    `;
    
    this.updateVisualizer();
  }

  bindEvents() {
    // Control buttons
    this.element.addEventListener('click', (e) => {
      const action = e.target.dataset.action;
      if (action === 'mute') this.toggleMute();
      else if (action === 'solo') this.toggleSolo();
      else if (action === 'remove') this.remove();
    });

    // Pattern controls
    this.element.querySelector('.beats-select').addEventListener('change', (e) => {
      this.setBeats(parseInt(e.target.value));
    });

    this.element.querySelector('.subdivision-select').addEventListener('change', (e) => {
      this.setSubdivision(parseInt(e.target.value));
    });

    // Volume control
    const volumeSlider = this.element.querySelector('.volume-slider');
    const volumeValue = this.element.querySelector('.volume-value');
    
    volumeSlider.addEventListener('input', (e) => {
      this.volume = parseInt(e.target.value);
      volumeValue.textContent = this.volume;
      this.emit('volumeChange', { trackId: this.options.id, volume: this.volume });
    });
  }

  setBeats(beats) {
    this.beats = beats;
    this.render();
    this.emit('patternChange', { trackId: this.options.id, beats: this.beats, subdivision: this.subdivision });
  }

  setSubdivision(subdivision) {
    this.subdivision = subdivision;
    this.render();
    this.emit('patternChange', { trackId: this.options.id, beats: this.beats, subdivision: this.subdivision });
  }

  toggleMute() {
    this.muted = !this.muted;
    const muteButton = this.element.querySelector('.track-mute');
    muteButton.classList.toggle('active', this.muted);
    this.emit('muteChange', { trackId: this.options.id, muted: this.muted });
  }

  toggleSolo() {
    this.solo = !this.solo;
    const soloButton = this.element.querySelector('.track-solo');
    soloButton.classList.toggle('active', this.solo);
    this.emit('soloChange', { trackId: this.options.id, solo: this.solo });
  }

  remove() {
    this.emit('removeTrack', { trackId: this.options.id });
    this.destroy();
  }

  updateBeat(beat, subdivision = 0) {
    this.currentBeat = beat;
    this.currentSubdivision = subdivision;
    this.updateVisualizer();
  }

  updateVisualizer() {
    const dots = this.element.querySelectorAll('.beat-dot');
    dots.forEach((dot, index) => {
      dot.classList.remove('active');
      const currentIndex = this.currentBeat * this.subdivision + this.currentSubdivision;
      if (index === currentIndex % dots.length) {
        dot.classList.add('active');
      }
    });
  }

  getPattern() {
    return {
      id: this.options.id,
      beats: this.beats,
      subdivision: this.subdivision,
      volume: this.volume,
      muted: this.muted,
      solo: this.solo
    };
  }
}