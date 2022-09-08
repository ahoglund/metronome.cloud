var AudioContext = window.AudioContext || window.webkitAudioContext;
var audioContext = new AudioContext();

import { BufferLoader } from './buffer-loader.js';

var isPlaying          = false;
var lookahead          = 25.0;
var scheduleAheadTime  = 0.1;
var nextTickTime       = 0.0;
var gainNode           = null;
var tempo              = null;
var tempoDisplay       = null;
var tempoSlider        = null;
var tapDisplay         = null;
var worker             = null;
var woodblock          = null;
var beatsPerBar        = null;
var beatType           = null;
var currentBeat        = 0;
var subdivision        = null;
var currentSubdivision = 0;
let tapTempoBuffer     = [];
let timer              = undefined;
let tapTimerTimeout    = 2000;

function resetPlayback() {
  currentBeat = 0;
  isPlaying   = false;
}

function toggle() {
  isPlaying = !isPlaying;

  if (isPlaying) {
    nextTickTime = audioContext.currentTime;
    worker.postMessage("start");
    return "STOP";
  } else {
    resetPlayback();
    worker.postMessage("stop");
    return "START";
  }
}

function nextTick() {
  nextTickTime += 60.0 / (tempo * subdivision);

  if (++currentSubdivision % subdivision == 0) {
    currentSubdivision = 0;
    currentBeat++;
  }

  if (currentBeat % beatsPerBar == 0) {
    currentBeat = 0;
  }
}

function scheduleTick(time) {
  var source = audioContext.createBufferSource();
  source.buffer = woodblock;

  if (currentBeat == 0 && currentSubdivision == 0) {
    gainNode.gain.setValueAtTime(1, time);
    source.playbackRate.value = 1.2;
  } else if (currentSubdivision == 0) {
    gainNode.gain.setValueAtTime(0.5, time);
    source.playbackRate.value = 1.0;
  } else {
    gainNode.gain.setValueAtTime(0.1, time);
    source.playbackRate.value = 0.8;
  }

  source.connect(gainNode);
  gainNode.connect(audioContext.destination);
  source.start(time);
}

function scheduler() {
  while (nextTickTime < audioContext.currentTime + scheduleAheadTime ) {
    scheduleTick(nextTickTime);
    nextTick();
  }
}

function initSounds(audioContext, urls) {
  var bufferLoader = new BufferLoader(audioContext, urls, function(bufferList) {
    woodblock = bufferList[0];
  });

  bufferLoader.load();
}

function initToggleButton() {
  var toggleButton = document.getElementById("toggle-button");

  toggleButton.addEventListener("click", function() {
    this.innerHTML = toggle();
  }, false);

  window.onkeydown = function(event) {
    if (event.keyCode == 32) {
      event.preventDefault();
      toggleButton.innerHTML = toggle();
    }
  };
}

function resetTimer() {
  timer = undefined;
}

function resetTimerAndClearBuffer() {
  resetTimer();
  tapTempoBuffer = [];
  tapDisplay.innerHTML = "Type 't' to set tempo";
}

function initTapTempo() {
  onkeydown = function(event) {
    if (event.keyCode == 84) {
      event.preventDefault();

      var currentTime = Date.now();
      clearTimeout(timer);
      nextIndex = tapTempoBuffer.length;

      if (timer == undefined) {
        timer = setTimeout(resetTimerAndClearBuffer, tapTimerTimeout);
        tapTempoBuffer[nextIndex] = currentTime;
        tapDisplay.innerHTML = "Keep tapping...";
      } else {
        timer = setTimeout(resetTimerAndClearBuffer, tapTimerTimeout);

        if (tapTempoBuffer.length > 3) {
          tapTempoBuffer.shift();
          calculateTempo();
        } else {
          tapDisplay.innerHTML = "Keep tapping...";
        }

        tapTempoBuffer.push(currentTime);
      }
    }
  }
}

function calculateTempo() {
  var averageTime = 0;
  for (var i = 0; i < tapTempoBuffer.length - 1; i++) {
    averageTime += tapTempoBuffer[i + 1] - tapTempoBuffer[i];
  }

  averageTime /= tapTempoBuffer.length - 1;
  tempo = Math.round(60000 / averageTime);
  tempoDisplay.value = tempo;
  tempoSlider.value = tempo;
}

function init() {
  gainNode = audioContext.createGain();
  worker = new Worker('js/worker.js');

  initSounds(audioContext, ["sounds/woodblock.ogg"]);

  initToggleButton();

  tempoDisplay             = document.getElementById("tempo-display");
  tapDisplay               = document.getElementById("tap-display");
  var timeSignatureDisplay = document.getElementById("time-signature-display");
  tempoSlider              = document.getElementById("tempo-slider");
  tempo                    = tempoSlider.value;
  tempoDisplay.innerHTML   = tempoSlider.value;

  tempoDisplay.oninput = function() {
    tempo = this.value;
    tempoSlider.value = this.value;
  }

  tempoSlider.oninput = function() {
    tempo = this.value;
    tempoDisplay.value = this.value;
  }

  initTapTempo();

  var beatPerBarDisplay  = document.getElementById("beat-per-bar-display");
  var beatTypeDisplay    = document.getElementById("beat-type-display");
  var subdivisionDisplay = document.getElementById("subdivision-display");

  beatTypeDisplay.oninput = function() {
    timeSignatureDisplay.innerHTML = beatPerBarDisplay.value + "/" + this.value;
  }

  beatPerBarDisplay.oninput = function() {
    beatsPerBar = this.value;
    timeSignatureDisplay.innerHTML = this.value + "/" + beatTypeDisplay.value;
  }

  subdivisionDisplay.oninput = function() {
    subdivision = this.value;
  }

  subdivision = subdivisionDisplay.value;
  beatsPerBar = beatPerBarDisplay.value;
  // beatType    = beatTypeDisplay.value;

  worker.onmessage = function(e) {
    if (e.data == "tick")
      scheduler();
    else
      console.log("message: " + e.data);
  };

  worker.postMessage({"interval":lookahead});
}

window.addEventListener("load", init() );
