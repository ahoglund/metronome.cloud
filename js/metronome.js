var isPlaying          = false;
var lookahead          = 25.0;
var scheduleAheadTime  = 0.1;
var nextNoteTime       = 0.0;
var tempo              = null;
var worker             = null;
var woodblock          = null;
var beatsPerBar        = null;
var beatType           = null;
var currentBeat        = 0;
var  currentBeatDisplay = null;

function toggle() {
  isPlaying = !isPlaying;

  if (isPlaying) {
    nextNoteTime = audioContext.currentTime;
    worker.postMessage("start");
    return "STOP";
  } else {
    currentBeat = 0;
    worker.postMessage("stop");
    return "START";
  }
}

function nextNote() {
  currentBeat++;
  nextNoteTime += 60.0 / tempo;

  if (currentBeat % beatsPerBar == 0) {
    currentBeat = 0;
  }
  currentBeatDisplay.innerHTML = currentBeat;
}

function scheduleNote(time) {
  var source = audioContext.createBufferSource();
  source.buffer = woodblock;
  if(currentBeat % beatsPerBar == 0) {
    source.playbackRate.value = 1.1;
  } else {
    source.playbackRate.value = 1;
  }
  source.connect(audioContext.destination);
  source.start(time);
}

function scheduler() {
  while (nextNoteTime < audioContext.currentTime + scheduleAheadTime ) {
    scheduleNote(nextNoteTime);
    nextNote();
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

  tempoSlider.oninput = function() {
    tempo = this.value;
    tempoDisplay.innerHTML = this.value;
  }

  var beatPerBarDisplay  = document.getElementById("beat-per-bar-display");
  var beatTypeDisplay    = document.getElementById("beat-type-display");
  currentBeatDisplay = document.getElementById("current-beat");

  beatPerBarDisplay.oninput = function() {
    beatsPerBar = this.value;
  }

  beatsPerBar = beatPerBarDisplay.value;
  beatType    = beatTypeDisplay.value;

  worker.onmessage = function(e) {
    if (e.data == "tick")
      scheduler();
    else
      console.log("message: " + e.data);
  };

  worker.postMessage({"interval":lookahead});
}

window.addEventListener("load", init );
