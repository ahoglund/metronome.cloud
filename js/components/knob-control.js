import { BaseComponent } from './base-component.js';

export class KnobControl extends BaseComponent {
  get defaultOptions() {
    return {
      min: 0,
      max: 100,
      value: 50,
      step: 1,
      size: 60,
      label: '',
      unit: '',
      sensitivity: 0.5
    };
  }

  init() {
    this.value = this.options.value;
    this.isDragging = false;
    this.startY = 0;
    this.startValue = 0;
    super.init();
  }

  render() {
    this.element.className = 'knob-control';
    this.element.innerHTML = `
      <div class="knob-container">
        <div class="knob-track"></div>
        <div class="knob-handle" style="width: ${this.options.size}px; height: ${this.options.size}px;">
          <div class="knob-indicator"></div>
        </div>
        <div class="knob-value">${this.formatValue(this.value)}</div>
      </div>
      ${this.options.label ? `<label class="knob-label">${this.options.label}</label>` : ''}
    `;

    this.handle = this.element.querySelector('.knob-handle');
    this.valueDisplay = this.element.querySelector('.knob-value');
    this.updateRotation();
  }

  bindEvents() {
    this.handle.addEventListener('mousedown', this.onMouseDown.bind(this));
    document.addEventListener('mousemove', this.onMouseMove.bind(this));
    document.addEventListener('mouseup', this.onMouseUp.bind(this));
    
    // Touch events for mobile
    this.handle.addEventListener('touchstart', this.onTouchStart.bind(this));
    document.addEventListener('touchmove', this.onTouchMove.bind(this));
    document.addEventListener('touchend', this.onTouchEnd.bind(this));

    // Prevent context menu
    this.handle.addEventListener('contextmenu', e => e.preventDefault());
  }

  onMouseDown(e) {
    e.preventDefault();
    this.startDrag(e.clientY);
  }

  onTouchStart(e) {
    e.preventDefault();
    this.startDrag(e.touches[0].clientY);
  }

  startDrag(y) {
    this.isDragging = true;
    this.startY = y;
    this.startValue = this.value;
    this.element.classList.add('dragging');
    document.body.style.cursor = 'ns-resize';
  }

  onMouseMove(e) {
    if (this.isDragging) {
      this.updateValue(e.clientY);
    }
  }

  onTouchMove(e) {
    if (this.isDragging) {
      e.preventDefault();
      this.updateValue(e.touches[0].clientY);
    }
  }

  updateValue(y) {
    const deltaY = this.startY - y;
    const range = this.options.max - this.options.min;
    const delta = (deltaY * this.options.sensitivity * range) / 100;
    
    let newValue = this.startValue + delta;
    newValue = Math.max(this.options.min, Math.min(this.options.max, newValue));
    
    // Snap to step
    newValue = Math.round(newValue / this.options.step) * this.options.step;
    
    if (newValue !== this.value) {
      this.setValue(newValue);
      this.emit('change', this.value);
    }
  }

  onMouseUp() {
    this.endDrag();
  }

  onTouchEnd() {
    this.endDrag();
  }

  endDrag() {
    this.isDragging = false;
    this.element.classList.remove('dragging');
    document.body.style.cursor = '';
  }

  setValue(value) {
    const oldValue = this.value;
    this.value = Math.max(this.options.min, Math.min(this.options.max, value));
    
    if (this.valueDisplay) {
      this.valueDisplay.textContent = this.formatValue(this.value);
    }
    
    this.updateRotation();
    
    if (oldValue !== this.value) {
      this.emit('change', this.value);
    }
  }

  getValue() {
    return this.value;
  }

  formatValue(value) {
    return Math.round(value) + (this.options.unit ? ` ${this.options.unit}` : '');
  }

  updateRotation() {
    const range = this.options.max - this.options.min;
    const normalized = (this.value - this.options.min) / range;
    const rotation = normalized * 270 - 135; // 270 degree range, starting at -135
    
    if (this.handle) {
      this.handle.style.transform = `rotate(${rotation}deg)`;
    }
  }
}