var count = 10;

// VISUAL STATE
let darkCanvas = true;
let selectedShape = "line fan";

// SOUND
let mic;
let fft;
let smoothBandEnergy = 0;

// UI
let uiPanel;
let shapeButtons = [];
let soundResponseSlider;
let autoSaveSelect;
let themeButton;
let startRecButton;
let saveRecButton;
let saveFrameButton;

// RECORDING
let canvasRecorder;
let mediaRecorder;
let recordedChunks = [];
let isRecording = false;

// FRAME EXPORT
let lastAutoSaveTime = 0;
let captureCount = 0;

// SOUND START STATE
let soundReady = false;
let toolEntered = false;

function setup() {
  canvasRecorder = createCanvas(windowWidth, windowHeight);
  rectMode(CORNER);
  ellipseMode(CENTER);

  setupSound();
  setupEnterButton();
  setupInterface();

  applyInterfaceTheme();

  uiPanel.hide();
}

function draw() {
  updateSound();

  let responseAmount = getSoundResponse();

  drawBackground();
  drawSoundForms(responseAmount);

  if (toolEntered) {
    handleAutoFrameCapture();
  }
}

function setupEnterButton() {
  let enterButton = select("#enter-button");

  enterButton.mousePressed(function () {
    let introScreen = select("#intro-screen");

    if (introScreen) {
      introScreen.hide();
    }

    toolEntered = true;
    uiPanel.show();
    startListening();
  });
}

function setupSound() {
  mic = new p5.AudioIn();
  fft = new p5.FFT(0.8, 1024);

  window.addEventListener("pointerdown", startListening);
}

function startListening() {
  if (soundReady) return;

  // Safer audio start for different p5 / p5.sound versions
  if (typeof userStartAudio === "function") {
    userStartAudio();
  } else if (typeof getAudioContext === "function") {
    getAudioContext().resume();
  }

  mic.start(
    function () {
      fft.setInput(mic);
      soundReady = true;
    },
    function () {
      console.log("Microphone could not start.");
    }
  );
}

function updateSound() {
  if (!soundReady) return;

  fft.analyze();

  let bandEnergy = fft.getEnergy("mid");

  smoothBandEnergy = lerp(smoothBandEnergy, bandEnergy, 0.12);
}

function getSoundResponse() {
  let sensitivity = soundResponseSlider.value();

  // Higher slider value = more responsive drawing
  let threshold = map(sensitivity, 0, 100, 220, 20);

  let reactiveEnergy = max(0, smoothBandEnergy - threshold);
  let expansion = map(reactiveEnergy, 0, max(1, 255 - threshold), 0, 1);

  expansion = constrain(expansion, 0, 1);

  return expansion;
}

function drawBackground() {
  if (darkCanvas) {
    background(0);
  } else {
    background(255);
  }
}

function drawSoundForms(expansion) {
  let maxTiles = 44;

  let tileCountX = floor(map(expansion, 0, 1, 4, maxTiles));
  let tileCountY = floor(map(expansion, 0, 1, 4, maxTiles));

  tileCountX = max(4, tileCountX);
  tileCountY = max(4, tileCountY);

  let tileWidth = width / tileCountX;
  let tileHeight = height / tileCountY;

  let spacing = map(expansion, 0, 1, 16, 4);

  let innerW = max(4, tileWidth - spacing);
  let innerH = max(4, tileHeight - spacing);

  push();
  translate(width / 2, height / 2);

  let offsetX = -(tileCountX * tileWidth) / 2;
  let offsetY = -(tileCountY * tileHeight) / 2;

  let maxD = dist(-width / 2, -height / 2, 0, 0);
  let activeRadius = map(expansion, 0, 1, maxD * 0.18, maxD);

  for (let gridY = 0; gridY < tileCountY; gridY++) {
    for (let gridX = 0; gridX < tileCountX; gridX++) {
      let posX = offsetX + tileWidth * gridX;
      let posY = offsetY + tileHeight * gridY;

      let tileCenterX = posX + tileWidth / 2;
      let tileCenterY = posY + tileHeight / 2;

      let d = dist(tileCenterX, tileCenterY, 0, 0);

      if (d > activeRadius) continue;

      let edgeFade = map(d, 0, maxD, 1, 0.22);

      push();
      translate(posX + spacing / 2, posY + spacing / 2);

      applyStrokeStyle(edgeFade, expansion);
      drawTileShape(selectedShape, innerW, innerH, expansion);

      pop();
    }
  }

  pop();
}

function applyStrokeStyle(edgeFade, expansion) {
  noFill();

  if (darkCanvas) {
    stroke(255, 255 * edgeFade);
  } else {
    stroke(0, 255 * edgeFade);
  }

  strokeWeight(map(expansion, 0, 1, 0.8, 3.2));
}

function drawTileShape(shapeMode, w, h, expansion) {
  if (shapeMode === "line fan") {
    drawLineFan(w, h);
    return;
  }

  if (shapeMode === "rectangle") {
    drawNestedRects(w, h, expansion);
    return;
  }

  if (shapeMode === "ellipse") {
    drawNestedEllipses(w, h, expansion);
    return;
  }

  if (shapeMode === "diamond") {
    drawNestedDiamonds(w, h, expansion);
    return;
  }

  if (shapeMode === "cross") {
    drawTexturedCross(w, h, expansion);
    return;
  }
}

function drawLineFan(w, h) {
  let x1 = w / 2;
  let y1 = h / 2;
  let x2 = 0;
  let y2 = 0;

  for (let side = 0; side < 4; side++) {
    for (let i = 0; i < count; i++) {
      switch (side) {
        case 0:
          x2 += w / count;
          y2 = 0;
          break;
        case 1:
          x2 = w;
          y2 += h / count;
          break;
        case 2:
          x2 -= w / count;
          y2 = h;
          break;
        case 3:
          x2 = 0;
          y2 -= h / count;
          break;
      }

      line(x1, y1, x2, y2);
    }
  }
}

function drawNestedRects(w, h, expansion) {
  let steps = floor(map(expansion, 0, 1, 3, 18));

  for (let i = 0; i < steps; i++) {
    let insetX = map(i, 0, max(1, steps - 1), 0, w * 0.42);
    let insetY = map(i, 0, max(1, steps - 1), 0, h * 0.42);

    rect(insetX, insetY, w - insetX * 2, h - insetY * 2);
  }
}

function drawNestedEllipses(w, h, expansion) {
  let steps = floor(map(expansion, 0, 1, 3, 18));

  for (let i = 0; i < steps; i++) {
    let ew = map(i, 0, max(1, steps - 1), w, w * 0.08);
    let eh = map(i, 0, max(1, steps - 1), h, h * 0.08);

    ellipse(w / 2, h / 2, ew, eh);
  }
}

function drawNestedDiamonds(w, h, expansion) {
  let steps = floor(map(expansion, 0, 1, 3, 18));

  for (let i = 0; i < steps; i++) {
    let sx = map(i, 0, max(1, steps - 1), w / 2, w * 0.04);
    let sy = map(i, 0, max(1, steps - 1), h / 2, h * 0.04);

    beginShape();
    vertex(w / 2, h / 2 - sy);
    vertex(w / 2 + sx, h / 2);
    vertex(w / 2, h / 2 + sy);
    vertex(w / 2 - sx, h / 2);
    endShape(CLOSE);
  }
}

function drawTexturedCross(w, h, expansion) {
  let steps = floor(map(expansion, 0, 1, 3, 12));

  for (let i = 0; i < steps; i++) {
    let inset = map(i, 0, max(1, steps - 1), 0, min(w, h) * 0.28);

    line(w * 0.2 + inset * 0.3, h * 0.5, w * 0.8 - inset * 0.3, h * 0.5);
    line(w * 0.5, h * 0.2 + inset * 0.3, w * 0.5, h * 0.8 - inset * 0.3);
  }
}

function setupInterface() {
  uiPanel = createDiv();
  uiPanel.id("control-panel");

  let shapeGroup = createDiv();
  shapeGroup.class("control-group shape-group");
  shapeGroup.parent(uiPanel);

  let shapeLabel = createSpan("Form");
  shapeLabel.class("control-label");
  shapeLabel.parent(shapeGroup);

  let shapes = [
    { name: "line fan", icon: "✺" },
    { name: "rectangle", icon: "▢" },
    { name: "ellipse", icon: "○" },
    { name: "diamond", icon: "◇" },
    { name: "cross", icon: "✕" }
  ];

  for (let s of shapes) {
    let btn = createButton("");
    btn.html('<span class="choice-dot"></span><span class="shape-icon">' + s.icon + "</span>");
    btn.class("shape-button");
    btn.attribute("title", s.name);
    btn.parent(shapeGroup);

    btn.mousePressed(function () {
      selectedShape = s.name;
      updateShapeButtons();
      startListening();
    });

    shapeButtons.push({ button: btn, name: s.name });
  }

  let responseGroup = createDiv();
  responseGroup.class("control-group response-group");
  responseGroup.parent(uiPanel);

  let responseLabel = createSpan("Sound Response");
  responseLabel.class("control-label");
  responseLabel.parent(responseGroup);

  soundResponseSlider = createSlider(0, 100, 62, 1);
  soundResponseSlider.class("sound-slider");
  soundResponseSlider.parent(responseGroup);
  soundResponseSlider.input(startListening);

  let autoSaveGroup = createDiv();
  autoSaveGroup.class("control-group");
  autoSaveGroup.parent(uiPanel);

  let autoSaveLabel = createSpan("Auto-save");
  autoSaveLabel.class("control-label");
  autoSaveLabel.parent(autoSaveGroup);

  autoSaveSelect = createSelect();
  autoSaveSelect.class("small-select");
  autoSaveSelect.option("off");
  autoSaveSelect.option("every 2s", "2000");
  autoSaveSelect.option("every 5s", "5000");
  autoSaveSelect.option("every 10s", "10000");
  autoSaveSelect.selected("off");
  autoSaveSelect.parent(autoSaveGroup);
  autoSaveSelect.changed(function () {
    lastAutoSaveTime = millis();
  });

  themeButton = createButton("Black bg / white marks");
  themeButton.class("pill-button");
  themeButton.parent(uiPanel);
  themeButton.mousePressed(function () {
    darkCanvas = !darkCanvas;
    applyInterfaceTheme();
  });

  startRecButton = createButton("Start recording");
  startRecButton.class("pill-button");
  startRecButton.parent(uiPanel);
  startRecButton.mousePressed(startRecording);

  saveRecButton = createButton("Save recording");
  saveRecButton.class("pill-button");
  saveRecButton.parent(uiPanel);
  saveRecButton.attribute("disabled", "true");
  saveRecButton.mousePressed(stopRecording);

  saveFrameButton = createButton("Save still");
  saveFrameButton.class("pill-button");
  saveFrameButton.parent(uiPanel);
  saveFrameButton.mousePressed(saveCurrentFrame);

  let aboutWrap = createDiv();
  aboutWrap.class("about-wrap");
  aboutWrap.parent(uiPanel);

  let aboutButton = createButton("About");
  aboutButton.class("pill-button about-button");
  aboutButton.parent(aboutWrap);

  let aboutText = createDiv(
    "This is a sound-reactive form-making tool. Your microphone input gently changes how the pattern expands. Choose a form, adjust how responsive it feels, then save stills or recordings. Click once anywhere to wake the microphone."
  );
  aboutText.class("about-text");
  aboutText.parent(aboutWrap);

  let fullscreenNote = createDiv("Press ‘F’ for full screen");
  fullscreenNote.class("fullscreen-note");
  fullscreenNote.parent(uiPanel);

  updateShapeButtons();
}

function updateShapeButtons() {
  for (let item of shapeButtons) {
    if (item.name === selectedShape) {
      item.button.addClass("active");
    } else {
      item.button.removeClass("active");
    }
  }
}

function applyInterfaceTheme() {
  if (darkCanvas) {
    document.body.classList.add("dark-canvas");
    document.body.classList.remove("light-canvas");

    if (themeButton) {
      themeButton.html("Black bg / white marks");
    }
  } else {
    document.body.classList.add("light-canvas");
    document.body.classList.remove("dark-canvas");

    if (themeButton) {
      themeButton.html("White bg / black marks");
    }
  }
}

function handleAutoFrameCapture() {
  let interval = autoSaveSelect.value();

  if (interval === "off") return;

  interval = int(interval);

  if (millis() - lastAutoSaveTime >= interval) {
    lastAutoSaveTime = millis();
    captureCount++;

    saveCanvas("frame_" + nf(captureCount, 4), "jpg");
  }
}

function saveCurrentFrame() {
  saveCanvas(
    "still_" +
      year() +
      nf(month(), 2) +
      nf(day(), 2) +
      "_" +
      nf(hour(), 2) +
      nf(minute(), 2) +
      nf(second(), 2),
    "jpg"
  );
}

function startRecording() {
  if (isRecording) return;

  startListening();

  let stream = canvasRecorder.elt.captureStream(30);
  recordedChunks = [];

  let options = {};

  if (MediaRecorder.isTypeSupported("video/webm;codecs=vp9")) {
    options.mimeType = "video/webm;codecs=vp9";
  } else if (MediaRecorder.isTypeSupported("video/webm")) {
    options.mimeType = "video/webm";
  }

  mediaRecorder = new MediaRecorder(stream, options);

  mediaRecorder.ondataavailable = function (e) {
    if (e.data && e.data.size > 0) {
      recordedChunks.push(e.data);
    }
  };

  mediaRecorder.onstop = function () {
    let blob = new Blob(recordedChunks, { type: "video/webm" });
    let url = URL.createObjectURL(blob);

    let a = document.createElement("a");
    a.href = url;
    a.download = "sound_form_recording.webm";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);

    URL.revokeObjectURL(url);
  };

  mediaRecorder.start();
  isRecording = true;

  startRecButton.attribute("disabled", "true");
  saveRecButton.removeAttribute("disabled");
}

function stopRecording() {
  if (!isRecording || !mediaRecorder) return;

  mediaRecorder.stop();
  isRecording = false;

  startRecButton.removeAttribute("disabled");
  saveRecButton.attribute("disabled", "true");
}

function keyPressed() {
  if (key === "f" || key === "F") {
    let fs = fullscreen();
    fullscreen(!fs);
  }
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
}