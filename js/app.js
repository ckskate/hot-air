// For grading purposes, the code that actually contains the heat diffusion
// part is entirely contained in the function coolAndUpdateGraph(). I've
// included more comments in there

// simulation parameters
var totalRecordingTime = 3000; // ms
var dataSampleInterval = 250; // ms
var totalNumberOfSamples = (totalRecordingTime / dataSampleInterval) - 1;
var analyserFftSize = 2048; // I just pulled this from a mozilla example, seems to work
var iterations = 0;
// expose the following two parameters to the user
var iterationCount = 1000;
var k = 0.5;
var iterationInput = document.querySelector('.iterations-val');
iterationInput.value = iterationCount;
var kInput = document.querySelector('.k-val');
kInput.value = k;

// visual
var canvas = document.querySelector('.visualizer');
canvas.width = screen.width;
canvas.height = screen.height * 0.5;
var canvasCtx = canvas.getContext('2d');

// audio processing
var audioCtx = new (window.AudioContext || window.webkitAudioContext)();
var source;
var stream;

var analyser = audioCtx.createAnalyser();
// lifted these settings from the mozilla voice-change-o-matic example
analyser.minDecibels = -90;
analyser.maxDecibels = -10;
analyser.smoothingTimeConstant = 0.85;

var audioData = [];
var untouchedAudioData = [];
var dataCollectionInterval = null;

// recording
var recordButton = document.querySelector('.record');
var playButton = document.querySelector('.play');
var resetButton = document.querySelector('.reset');
var saveButton = document.querySelector('.save');
var totalTime = 0.0;
var chunks = [];
var timerInterval = null;

// downloader
var capturer = new CCapture( { format: 'gif', workersPath: 'js/' } );

drawDefaultLine();

// start collecting microphone data
navigator.mediaDevices.getUserMedia({ audio: true, video: false })
  .then(beginCapturingAndRecording).catch(function(error) {
    console.log("the following error occurred: ");
    console.log(error);
});

// callback for when the user allows mic input to be captured.
function beginCapturingAndRecording(stream) {

  console.log("now collecting mic data");

  // audio processing
  source = audioCtx.createMediaStreamSource(stream);
  source.connect(analyser);
};

function drawDefaultLine() {
  var WIDTH = canvas.width;
  var HEIGHT = canvas.height;

  canvasCtx.clearRect(0, 0, WIDTH, HEIGHT);

  canvasCtx.lineWidth = 2;
  canvasCtx.strokeStyle = 'rgb(5, 56, 107)';
  canvasCtx.beginPath();

  canvasCtx.moveTo(0.5, HEIGHT/2 + 0.5);
  canvasCtx.lineTo(WIDTH + 0.5, HEIGHT/2 + 0.5);

  canvasCtx.stroke();
}

// function for starting the recording when record button is pressed
recordButton.onclick = function() {
  if (recordButton.classList.contains("disabled")) {
    return;
  }
  if (timerInterval !== null) {
    console.log("already recording");
    return;
  }

  resetButton.classList.add("disabled");
  playButton.classList.add("disabled");
  saveButton.classList.add("disabled");
  recordButton.classList.add("disabled");

  // clear the recorded data
  audioData = [];
  untouchedAudioData = [];
  // clear the canvas
  canvasCtx.clearRect(0, 0, canvas.width, canvas.height);
  // record for 3 seconds
  timerInterval = setInterval(stopRecording, totalRecordingTime);
  // collect the data
  dataCollectionInterval = setInterval(collectData, dataSampleInterval);
};

playButton.onclick = function() {
  if (playButton.classList.contains("disabled")) {
    return;
  }
  if (audioData !== [] && audioData !== null
    && audioData !== undefined) {
    capturer.start();
    coolAndUpdateGraph();
    playButton.classList.add("disabled");
    recordButton.classList.add("disabled");
  }
}

resetButton.onclick = function() {
  if (untouchedAudioData === [] || untouchedAudioData === null
    || untouchedAudioData === undefined) {
    return;
  }

  if (resetButton.classList.contains("disabled")) {
    return;
  }

  iterations = 0;
  audioData = untouchedAudioData.slice();

  var WIDTH = canvas.width;
  var HEIGHT = canvas.height;

  canvasCtx.clearRect(0, 0, WIDTH, HEIGHT);

  canvasCtx.lineWidth = 2;
  canvasCtx.strokeStyle = 'rgb(5, 56, 107)';

  canvasCtx.beginPath();

  var sliceWidth = WIDTH * 1.0 / untouchedAudioData.length;
  var x = 0.5;

  for (var i = 0; i < untouchedAudioData.length; i++) {
    var v = untouchedAudioData[i] / 128.0;
    var y = v * HEIGHT/2;

    if (i === 0) {
      canvasCtx.moveTo(x, y + 0.5);
    } else {
      canvasCtx.lineTo(x, y + 0.5);
    }
    x += sliceWidth;
  }

  canvasCtx.lineTo(canvas.width, canvas.height/2 + 0.5);
  canvasCtx.stroke();

  resetButton.classList.add("disabled");
  saveButton.classList.add("disabled");
  playButton.classList.remove("disabled");
}

saveButton.onclick = function() {
  if (saveButton.classList.contains("disabled")) {
    return;
  }
  console.log("saving");
  saveButton.classList.add("disabled");
  capturer.save();
}

iterationInput.onchange = function() {
  val = Math.floor(iterationInput.value);
  if (val < 10000 && val > 0) {
    iterationCount = val;
  }
}

kInput.onchange = function() {
  val = kInput.value;
  if (val > 0.0 && val <= 1.0) {
    k = val;
  }
}

// function for stopping the recording
function stopRecording() {
  clearInterval(timerInterval);
  timerInterval = null;
  clearInterval(dataCollectionInterval);
  dataCollectionInterval = null;

  // TODO: remove the .disabled classes from the buttons
  playButton.classList.remove("disabled");
  recordButton.classList.remove("disabled");

  iterations = 0;
  untouchedAudioData = audioData.slice(); // make a copy of the audio data
  // coolAndUpdateGraph(); // update and draw new waveform
}

function collectData() {
  console.log("collectData");

  analyser.fftSize = analyserFftSize;
  var bufferLength = analyser.fftSize;
  var dataArray = new Uint8Array(bufferLength);

  // could also get frequency domain data, but it's
  // less exciting looking when it cools.
  analyser.getByteTimeDomainData(dataArray);

  // draw the waveform in real time
  var WIDTH = canvas.width;
  var HEIGHT = canvas.height;

  canvasCtx.lineWidth = 2;
  canvasCtx.strokeStyle = 'rgb(5, 56, 107)';

  canvasCtx.beginPath();

  var sliceWidth = canvas.width * 1.0 / (analyserFftSize * totalNumberOfSamples);
  var x = audioData.length * sliceWidth + 0.5; // start in the correct position

  for (var i = 0; i < bufferLength; i++) {
    audioData.push(dataArray[i]); // append to the audio data array

    var v = dataArray[i] / 128.0;
    var y = v * HEIGHT/2;

    if (i === 0) {
      canvasCtx.moveTo(x, y + 0.5);
    } else {
      canvasCtx.lineTo(x, y + 0.5);
    }
    x += sliceWidth;
  }
  canvasCtx.stroke();
}

function coolAndUpdateGraph() {
  if (audioData.length === 0) {
    console.log("error: cooling before data is collected");
    return;
  }

  iterations++;
  if (iterations <= iterationCount) {
    requestAnimationFrame(coolAndUpdateGraph);
  } else {
    console.log("stopping the capture");
    capturer.stop();
    resetButton.classList.remove("disabled");
    saveButton.classList.remove("disabled");
    recordButton.classList.remove("disabled");
  }

  // HERE IS THE COOLING CODE ==================================================
  let n = audioData.length;

  // boundary conditions
  audioData[0] = 128;
  audioData[n-1] = 128;

  var newAudioData = audioData.slice(); // copy the old audio data
  for (var j = 1; j < n - 1; j++) {
    var newTerm = k * (audioData[j+1] - 2*audioData[j] + audioData[j-1]) + audioData[j];
    newAudioData[j] = Math.ceil(Math.round(newTerm));
  }
  audioData = newAudioData;
  // END OF THE COOLING CODE ===================================================

  // update visuals

  var WIDTH = canvas.width;
  var HEIGHT = canvas.height;

  canvasCtx.clearRect(0, 0, WIDTH, HEIGHT);

  canvasCtx.lineWidth = 2;
  canvasCtx.strokeStyle = 'rgb(5, 56, 107)';

  canvasCtx.beginPath();

  var sliceWidth = WIDTH * 1.0 / audioData.length;
  var x = 0.5;

  for (var i = 0; i < audioData.length; i++) {
    var v = audioData[i] / 128.0;
    var y = v * HEIGHT/2;

    if (i === 0) {
      canvasCtx.moveTo(x, y + 0.5);
    } else {
      canvasCtx.lineTo(x, y + 0.5);
    }
    x += sliceWidth;
  }

  canvasCtx.lineTo(canvas.width, canvas.height/2 + 0.5);
  canvasCtx.stroke();
  capturer.capture(canvas);
}
