import { BaseComponent } from './base-component.js';

export class LEDDisplay extends BaseComponent {
  get defaultOptions() {
    return {
      digits: 3,
      label: '',
      color: '#00ff00',
      backgroundColor: '#001100',
      fontSize: '24px',
      format: 'number' // 'number', 'time', 'custom'
    };
  }

  init() {
    this.value = '';
    super.init();
  }

  render() {
    this.element.className = 'led-display';
    this.element.innerHTML = `
      ${this.options.label ? `<label class="led-label">${this.options.label}</label>` : ''}
      <div class="led-screen" style="
        background-color: ${this.options.backgroundColor};
        color: ${this.options.color};
        font-size: ${this.options.fontSize};
      ">
        <span class="led-text">${this.formatDisplay('')}</span>
      </div>
    `;

    this.screen = this.element.querySelector('.led-text');
  }

  setValue(value) {
    this.value = value;
    if (this.screen) {
      this.screen.textContent = this.formatDisplay(value);
    }
  }

  formatDisplay(value) {
    if (this.options.format === 'time') {
      return this.formatTime(value);
    } else if (this.options.format === 'number') {
      return this.formatNumber(value);
    }
    return String(value).padStart(this.options.digits, ' ');
  }

  formatNumber(value) {
    if (value === '' || value === null || value === undefined) {
      return ''.padStart(this.options.digits, '-');
    }
    return String(Math.round(value)).padStart(this.options.digits, ' ');
  }

  formatTime(value) {
    if (!value) return '--:--';
    const minutes = Math.floor(value / 60);
    const seconds = Math.floor(value % 60);
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  }

  blink(duration = 500) {
    this.element.classList.add('blinking');
    setTimeout(() => {
      this.element.classList.remove('blinking');
    }, duration);
  }
}