var audioContext      = null;
var isPlaying         = false;
var tempo             = 60.0;
var lookahead         = 25.0;
var currentTick       = 0;
var scheduleAheadTime = 0.1
var nextNoteTime      = 0.0;
var noteLength        = 0.05;
var worker            = null;
var woodblock         = null;

function toggle() {
  isPlaying = !isPlaying;

  if (isPlaying) {
    nextNoteTime = audioContext.currentTime;
    worker.postMessage("start");
    return "STOP";
  } else {
    worker.postMessage("stop");
    return "START";
  }
}

function nextNote() {
  nextNoteTime += 60.0 / tempo;
}

function scheduleNote(time) {
  var source = audioContext.createBufferSource();
  source.buffer = woodblock;
  source.connect(audioContext.destination);
  source.start(time);
  source.stop(time + noteLength);
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


  var tempoSlider = document.getElementById("tempo-slider");
  var tempoDisplay = document.getElementById("tempo-display");
  tempoDisplay.innerHTML = tempoSlider.value;

  tempoSlider.oninput = function() {
    tempo             = this.value;
    tempoDisplay.innerHTML  = this.value;
  }

  worker.onmessage = function(e) {
    if (e.data == "tick")
      scheduler();
    else
      console.log("message: " + e.data);
  };

  worker.postMessage({"interval":lookahead});
}

window.addEventListener("load", init );
