const dotsPerCell = 10;
const minDot = 0.25;
const maxDotScale = 1.3;

const canvas = document.getElementById("halftone-background");
const ctx = canvas.getContext("2d");
const mediaInput = document.getElementById("media-input");
const status = document.getElementById("status");

const sourceCanvas = document.createElement("canvas");
const sourceCtx = sourceCanvas.getContext("2d", { willReadFrequently: true });

let activeVideo = null;
let animationFrameId = null;

resizeCanvas();
window.addEventListener("resize", resizeCanvas);
mediaInput.addEventListener("change", handleMediaChange);

function resizeCanvas() {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
}

function stopVideoLoop() {
  if (animationFrameId !== null) {
    cancelAnimationFrame(animationFrameId);
    animationFrameId = null;
  }

  if (activeVideo) {
    activeVideo.pause();
    URL.revokeObjectURL(activeVideo.dataset.src || "");
    activeVideo.removeAttribute("src");
    activeVideo.load();
    activeVideo = null;
  }
}

async function handleMediaChange(event) {
  const file = event.target.files?.[0];
  if (!file) return;

  stopVideoLoop();

  if (file.type.startsWith("image/")) {
    await renderImage(file);
    status.textContent = "이미지를 halftone 배경으로 적용했습니다.";
    return;
  }

  if (file.type.startsWith("video/")) {
    await renderVideo(file);
    status.textContent = "영상을 halftone 배경으로 재생 중입니다.";
    return;
  }

  status.textContent = "이미지/영상 파일만 선택해 주세요.";
}

async function renderImage(file) {
  const image = await loadImageFromFile(file);
  const frame = drawContain(image.naturalWidth, image.naturalHeight, image);
  drawHalftoneFrame(frame.width, frame.height);
}

async function renderVideo(file) {
  const video = document.createElement("video");
  video.muted = true;
  video.loop = true;
  video.playsInline = true;

  const src = URL.createObjectURL(file);
  video.src = src;
  video.dataset.src = src;

  await waitForEvent(video, "loadeddata");
  await video.play();

  activeVideo = video;

  const draw = () => {
    if (!activeVideo) return;
    const frame = drawContain(video.videoWidth, video.videoHeight, video);
    drawHalftoneFrame(frame.width, frame.height);
    animationFrameId = requestAnimationFrame(draw);
  };

  draw();
}

function drawContain(mediaWidth, mediaHeight, mediaElement) {
  const viewWidth = canvas.width;
  const viewHeight = canvas.height;

  const scale = Math.max(viewWidth / mediaWidth, viewHeight / mediaHeight);
  const drawWidth = Math.max(1, Math.round(mediaWidth * scale));
  const drawHeight = Math.max(1, Math.round(mediaHeight * scale));
  const dx = Math.round((viewWidth - drawWidth) / 2);
  const dy = Math.round((viewHeight - drawHeight) / 2);

  sourceCanvas.width = viewWidth;
  sourceCanvas.height = viewHeight;

  sourceCtx.fillStyle = "#f4f4f4";
  sourceCtx.fillRect(0, 0, viewWidth, viewHeight);

  sourceCtx.drawImage(mediaElement, dx, dy, drawWidth, drawHeight);

  return { width: viewWidth, height: viewHeight };
}

function drawHalftoneFrame(width, height) {
  const imageData = sourceCtx.getImageData(0, 0, width, height).data;

  ctx.fillStyle = "#f4f4f4";
  ctx.fillRect(0, 0, width, height);

  for (let y = 0; y < height; y += dotsPerCell) {
    for (let x = 0; x < width; x += dotsPerCell) {
      const brightness = sampleAverageBrightness(imageData, width, height, x, y, dotsPerCell);
      const darkness = 1 - brightness / 255;
      if (darkness <= 0.01) continue;

      const radius = Math.max(minDot, (dotsPerCell * maxDotScale * darkness) / 2);
      ctx.beginPath();
      ctx.fillStyle = "#111";
      ctx.arc(x + dotsPerCell / 2, y + dotsPerCell / 2, radius, 0, Math.PI * 2);
      ctx.fill();
    }
  }
}

function sampleAverageBrightness(data, width, height, startX, startY, size) {
  let total = 0;
  let count = 0;

  const endX = Math.min(startX + size, width);
  const endY = Math.min(startY + size, height);

  for (let y = startY; y < endY; y++) {
    for (let x = startX; x < endX; x++) {
      const idx = (y * width + x) * 4;
      const r = data[idx];
      const g = data[idx + 1];
      const b = data[idx + 2];
      total += 0.299 * r + 0.587 * g + 0.114 * b;
      count++;
    }
  }

  return count ? total / count : 255;
}

function loadImageFromFile(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const image = new Image();
      image.onload = () => resolve(image);
      image.onerror = reject;
      image.src = String(reader.result);
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function waitForEvent(target, eventName) {
  return new Promise((resolve, reject) => {
    const onLoaded = () => {
      cleanup();
      resolve();
    };
    const onError = () => {
      cleanup();
      reject(new Error(`${eventName} 이벤트를 처리하지 못했습니다.`));
    };
    const cleanup = () => {
      target.removeEventListener(eventName, onLoaded);
      target.removeEventListener("error", onError);
    };

    target.addEventListener(eventName, onLoaded, { once: true });
    target.addEventListener("error", onError, { once: true });
  });
}
