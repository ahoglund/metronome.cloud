var audioContext      = null;
var unlocked          = false;
var isPlaying         = false;
var current16thNote   = 0;
var tempo             = 120.0;
var lookahead         = 25.0;
var scheduleAheadTime = 0.1
var nextNoteTime      = 0.0;
var noteLength        = 0.05;
var worker            = null;
var woodblock         = null;

function play() {
  if (!unlocked) {
    // play silent buffer to unlock the audio
    var buffer = audioContext.createBuffer(1, 1, 22050);
    var node = audioContext.createBufferSource();
    node.buffer = buffer;
    node.start(0);
    unlocked = true;
  }

  isPlaying = !isPlaying;

  if (isPlaying) {
    current16thNote = 0;
    nextNoteTime = audioContext.currentTime;
    worker.postMessage("start");
    return "stop";
  } else {
    worker.postMessage("stop");
    return "play";
  }
}

function nextNote() {
  var secondsPerBeat = 60.0 / tempo;
  nextNoteTime += 0.25 * secondsPerBeat;

  current16thNote++;
  if (current16thNote == 16) {
    current16thNote = 0;
  }
}

function scheduleNote( beatNumber, time ) {
  // var osc = audioContext.createOscillator();
  // osc.connect( audioContext.destination );

  // if (beatNumber % 16 === 0)
  //   osc.frequency.value = 880.0;
  // else if (beatNumber % 4 === 0 )
  //   osc.frequency.value = 440.0;
  // else
  //   osc.frequency.value = 220.0;

  // osc.start( time );
  // osc.stop( time + noteLength );
  var source = audioContext.createBufferSource(); // creates a sound source
  source.buffer = woodblock;                    // tell the source which sound to play
  source.connect(audioContext.destination);       // connect the source to the context's destination (the speakers)
  source.start(time);                          // play the source now
  source.stop( time + noteLength );
}

function scheduler() {
  while (nextNoteTime < audioContext.currentTime + scheduleAheadTime ) {
    scheduleNote( current16thNote, nextNoteTime );
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

  worker.onmessage = function(e) {
    if (e.data == "tick")
      scheduler();
    else
      console.log("message: " + e.data);
  };

  worker.postMessage({"interval":lookahead});
}

window.addEventListener("load", init );
