export class BaseComponent {
  constructor(element, options = {}) {
    this.element = element;
    this.options = { ...this.defaultOptions, ...options };
    this.listeners = new Map();
    this.init();
  }

  get defaultOptions() {
    return {};
  }

  init() {
    this.render();
    this.bindEvents();
  }

  render() {
    // Override in subclasses
  }

  bindEvents() {
    // Override in subclasses
  }

  on(event, callback) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }
    this.listeners.get(event).push(callback);
    return this;
  }

  emit(event, data) {
    if (this.listeners.has(event)) {
      this.listeners.get(event).forEach(callback => callback(data));
    }
  }

  destroy() {
    this.listeners.clear();
    if (this.element && this.element.parentNode) {
      this.element.parentNode.removeChild(this.element);
    }
  }
}