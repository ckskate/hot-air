// $(document).foundation();

// simulation parameters
var totalRecordingTime = 3000; // ms
var dataSampleInterval = 250; // ms
var totalNumberOfSamples = (totalRecordingTime / dataSampleInterval) - 1;
var analyserFftSize = 2048; // I just pulled this from a mozilla example
var iterations = 0;
// expose the following two parameters to the user
var iterationCount = 1000;
var k = 0.5;

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
  if (audioData !== [] && audioData !== null
    && audioData !== undefined) {
    capturer.start();
    coolAndUpdateGraph();
    playButton.classList.add("disabled");
  }
}

resetButton.onclick = function() {
  if (untouchedAudioData === [] || untouchedAudioData === null
    || untouchedAudioData === undefined) {
    return;
  }

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
  console.log("saving");
  saveButton.classList.add("disabled");
  capturer.save();
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
  }

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
