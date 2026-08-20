/**
 * Thin, fail-safe wrapper around Umami Cloud.
 *
 * The tracking script is loaded with `defer` from index.html and is routinely
 * blocked by ad blockers, so `window.umami` may never exist. Every call here
 * must be a silent no-op in that case: some of these fire from the audio
 * scheduler, where a thrown error would break metronome timing.
 */

/**
 * Send a custom event. Never throws.
 * @param {string} event - Event name, e.g. "start".
 * @param {Object} [data] - Flat map of primitive props.
 */
function track(event, data) {
  try {
    if (window.umami && typeof window.umami.track === "function") {
      window.umami.track(event, data);
    }
  } catch (_) {
    // Analytics must never affect the app.
  }
}

export { track };
