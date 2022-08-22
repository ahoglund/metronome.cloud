var isPlaying          = false;
var lookahead          = 25.0;
var scheduleAheadTime  = 0.1;
var nextTickTime       = 0.0;
var gainNode           = null;
var tempo              = null;
var worker             = null;
var woodblock          = null;
var beatsPerBar        = null;
var beatType           = null;
var currentBeat        = 0;
var subdivision        = null;
var currentSubdivision = 0;

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

function loadSound(url) {
  var request = new XMLHttpRequest();
  request.open("GET", url, true);
  request.responseType = "arraybuffer";
  request.onload = function() {
    audioContext.decodeAudioData(request.response, function(buffer) {
      woodblock = buffer;
    });
  }
  request.send();
}

function init(){
  var AudioContext = window.AudioContext || window.webkitAudioContext;
  audioContext = new AudioContext();
  gainNode = audioContext.createGain();
  worker = new Worker('js/worker.js');

  loadSound("sounds/woodblock.ogg");

  var toggleButton = document.getElementById("toggle-button");
  toggleButton.addEventListener("click", function() {
    this.innerHTML = toggle();
  });

  var tempoDisplay       = document.getElementById("tempo-display");
  var tempoSlider        = document.getElementById("tempo-slider");
  tempo = tempoSlider.value;
  tempoDisplay.innerHTML = tempoSlider.value;

  tempoDisplay.oninput = function() {
    tempo = this.value;
    tempoSlider.value = this.value;
  }

  tempoSlider.oninput = function() {
    tempo = this.value;
    tempoDisplay.innerHTML = this.value;
  }

  var beatPerBarDisplay  = document.getElementById("beat-per-bar-display");
  // var beatTypeDisplay    = document.getElementById("beat-type-display");
  var subdivisionDisplay = document.getElementById("subdivision-display");

  beatPerBarDisplay.oninput = function() {
    beatsPerBar = this.value;
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

window.addEventListener("load", init );
