import { BaseComponent } from './base-component.js';

export class BeatIndicator extends BaseComponent {
  get defaultOptions() {
    return {
      beatsPerBar: 4,
      subdivision: 1,
      size: 'medium', // 'small', 'medium', 'large'
      style: 'circular' // 'circular', 'bar', 'led'
    };
  }

  init() {
    this.currentBeat = 0;
    this.currentSubdivision = 0;
    this.isActive = false;
    super.init();
  }

  render() {
    this.element.className = `beat-indicator beat-indicator--${this.options.style} beat-indicator--${this.options.size}`;
    
    if (this.options.style === 'circular') {
      this.renderCircular();
    } else if (this.options.style === 'bar') {
      this.renderBar();
    } else if (this.options.style === 'led') {
      this.renderLED();
    }
  }

  renderCircular() {
    const beats = [];
    for (let i = 0; i < this.options.beatsPerBar; i++) {
      const subdivisions = [];
      for (let j = 0; j < this.options.subdivision; j++) {
        subdivisions.push(`<div class="subdivision subdivision-${j}" data-beat="${i}" data-subdivision="${j}"></div>`);
      }
      beats.push(`
        <div class="beat beat-${i}" data-beat="${i}">
          <div class="beat-main"></div>
          <div class="subdivisions">${subdivisions.join('')}</div>
        </div>
      `);
    }
    
    this.element.innerHTML = `
      <div class="beat-circle">
        ${beats.join('')}
      </div>
    `;
  }

  renderBar() {
    const beats = [];
    for (let i = 0; i < this.options.beatsPerBar; i++) {
      const subdivisions = [];
      for (let j = 0; j < this.options.subdivision; j++) {
        subdivisions.push(`<div class="subdivision" data-beat="${i}" data-subdivision="${j}"></div>`);
      }
      beats.push(`
        <div class="beat" data-beat="${i}">
          <div class="beat-main"></div>
          <div class="subdivisions">${subdivisions.join('')}</div>
        </div>
      `);
    }
    
    this.element.innerHTML = `
      <div class="beat-bar">
        ${beats.join('')}
      </div>
    `;
  }

  renderLED() {
    this.element.innerHTML = `
      <div class="led-grid">
        <div class="current-beat">
          <span class="beat-number">${this.currentBeat + 1}</span>
          <span class="beat-label">BEAT</span>
        </div>
        <div class="beat-dots">
          ${Array.from({length: this.options.beatsPerBar}, (_, i) => 
            `<div class="beat-dot" data-beat="${i}"></div>`
          ).join('')}
        </div>
      </div>
    `;
  }

  updateBeat(beat, subdivision = 0) {
    this.currentBeat = beat;
    this.currentSubdivision = subdivision;
    
    // Clear all active states
    this.element.querySelectorAll('.active, .active-subdivision').forEach(el => {
      el.classList.remove('active', 'active-subdivision');
    });
    
    if (this.options.style === 'led') {
      const beatNumber = this.element.querySelector('.beat-number');
      if (beatNumber) {
        beatNumber.textContent = beat + 1;
      }
      
      const activeDot = this.element.querySelector(`[data-beat="${beat}"]`);
      if (activeDot) {
        activeDot.classList.add('active');
      }
    } else {
      // Activate current beat
      const activeBeat = this.element.querySelector(`[data-beat="${beat}"]`);
      if (activeBeat) {
        activeBeat.classList.add('active');
        
        // Activate subdivision if present
        const activeSubdivision = activeBeat.querySelector(`[data-subdivision="${subdivision}"]`);
        if (activeSubdivision) {
          activeSubdivision.classList.add('active-subdivision');
        }
      }
    }
  }

  updateTimeSignature(beatsPerBar, subdivision) {
    this.options.beatsPerBar = beatsPerBar;
    this.options.subdivision = subdivision;
    this.render();
  }

  flash() {
    this.element.classList.add('flash');
    setTimeout(() => {
      this.element.classList.remove('flash');
    }, 100);
  }

  start() {
    this.isActive = true;
    this.element.classList.add('active');
  }

  stop() {
    this.isActive = false;
    this.element.classList.remove('active');
    this.element.querySelectorAll('.active, .active-subdivision').forEach(el => {
      el.classList.remove('active', 'active-subdivision');
    });
  }
}