const SVG_NS = "http://www.w3.org/2000/svg";
const screenSvg = document.querySelector("#screen");
const homeLizardStage = document.querySelector("#home-lizard-stage");
const homeLizardCanvas = document.querySelector("#home-lizard-canvas");
const homeLizardContext = homeLizardCanvas.getContext("2d");
const navButtons = [...document.querySelectorAll(".nav-button")];
const homeNavButton = navButtons.find((button) => button.dataset.section === "home");
const navFractureState = new WeakMap();
const navButtonLayoutCache = new WeakMap();
const contactTextFractureState = new WeakMap();
const contactTextLayoutCache = new WeakMap();
const projectsOrbit = document.querySelector("#projects-orbit");
const projectsDial = document.querySelector("#projects-dial");
const aboutPanel = document.querySelector("#about-panel");
const contactPanel = document.querySelector("#contact-panel");
const contactDinoStage = document.querySelector("#contact-dino-stage");
const contactDinoCanvas = document.querySelector("#contact-dino-canvas");
const contactDinoContext = contactDinoCanvas.getContext("2d");
const helpText = document.querySelector("#help-text");
const contactRunnerScoreboard = document.querySelector("#contact-runner-scoreboard");
const contactRunnerScoreCanvas = document.querySelector("#contact-runner-score-canvas");
const contactRunnerScoreContext = contactRunnerScoreCanvas.getContext("2d");
const contactRunnerOverlay = document.querySelector("#contact-runner-overlay");
const contactRunnerGameOverCanvas = document.querySelector("#contact-runner-gameover-canvas");
const contactRunnerGameOverContext = contactRunnerGameOverCanvas.getContext("2d");
const contactRunnerRestart = document.querySelector("#contact-runner-restart");
const contactRunnerRestartCanvas = document.querySelector("#contact-runner-restart-canvas");
const contactRunnerRestartContext = contactRunnerRestartCanvas.getContext("2d");
const stickerStage = document.querySelector("#sticker-stage");
const stickerCard = document.querySelector("#sticker-card");
const stickerImage = document.querySelector("#sticker-image");
const workerCanvas = document.createElement("canvas");
const workerContext = workerCanvas.getContext("2d");

const IMAGE_EXTENSIONS = [".jpg", ".jpeg", ".png", ".webp", ".gif", ".avif"];
const VIDEO_EXTENSIONS = [".mp4", ".webm", ".mov", ".m4v", ".ogv"];
const CONTACT_RUNNER_SPRITE_URL = "./200-offline-sprite.png";
const CONTACT_RUNNER_BEST_SCORE_KEY = "contact-runner-best-score";
const CONTACT_RUNNER_SPRITES = {
  restart: { x: 2, y: 2, width: 72, height: 64, drawWidth: 36, drawHeight: 32 },
  cloud: { x: 166, y: 2, width: 92, height: 28, drawWidth: 46, drawHeight: 14 },
  bird: { x: 260, y: 2, width: 92, height: 80, drawWidth: 46, drawHeight: 40, frameOffset: 92 },
  cactusSmall: { x: 446, y: 2, width: 34, height: 70, drawWidth: 17, drawHeight: 35 },
  cactusLarge: { x: 652, y: 2, width: 50, height: 100, drawWidth: 25, drawHeight: 50 },
  horizon: { x: 2, y: 104, width: 1200, height: 24, drawWidth: 600, drawHeight: 12 },
  scoreText: { x: 1294, y: 2, glyphWidth: 20, glyphHeight: 24, drawWidth: 10, drawHeight: 12 },
  gameOver: { x: 1294, y: 28, width: 382, height: 22, drawWidth: 191, drawHeight: 11 },
  moonPhases: [
    { x: 954, y: 2, width: 40, height: 80, drawWidth: 20, drawHeight: 40 },
    { x: 994, y: 2, width: 40, height: 80, drawWidth: 20, drawHeight: 40 },
    { x: 1034, y: 2, width: 40, height: 80, drawWidth: 20, drawHeight: 40 },
    { x: 1074, y: 2, width: 80, height: 80, drawWidth: 40, drawHeight: 40 },
    { x: 1154, y: 2, width: 40, height: 80, drawWidth: 20, drawHeight: 40 },
    { x: 1194, y: 2, width: 40, height: 80, drawWidth: 20, drawHeight: 40 },
    { x: 1234, y: 2, width: 58, height: 80, drawWidth: 29, drawHeight: 40 },
  ],
  trexStand: { x: 1678, y: 2, width: 88, height: 94, drawWidth: 44, drawHeight: 47 },
  trexRun1: { x: 1766, y: 2, width: 88, height: 94, drawWidth: 44, drawHeight: 47 },
  trexRun2: { x: 1854, y: 2, width: 88, height: 94, drawWidth: 44, drawHeight: 47 },
  trexCrash: { x: 1942, y: 2, width: 88, height: 94, drawWidth: 44, drawHeight: 47 },
  trexDuck1: { x: 2030, y: 2, width: 118, height: 60, drawWidth: 59, drawHeight: 30 },
  trexDuck2: { x: 2148, y: 2, width: 118, height: 60, drawWidth: 59, drawHeight: 30 },
};
const NAV_SCRAMBLE_GLYPHS = "₩0123456789-=abcdefghijklmnopqrstuvwxyz";
const CONVENTIONAL_MEDIA = [
  "background/background.mp4",
  "background/background.webm",
  "background/background.mov",
  "background/background.jpg",
  "background/background.jpeg",
  "background/background.png",
  "background/background.webp",
  "background/background.avif",
];
const PROJECTS = [
  // Fill `homepage` with the real URL you want to open for each project.
  { title: "geegle", homepage: "https://shimseunggi.github.io/geegle/" },
  { title: "nura.kr", homepage: "https://nura.kr" },
  { title: "NOT visionOS", homepage: "https://shimseunggi.github.io/NOT-visionOS/" },
  { title: "shimseunggi.kro.kr", homepage: "https://shimseunggi.kro.kr" },
  { title: "comet logo", sticker: "sticker/comet.PNG" },
  { title: "rocket ha nyang", sticker: "sticker/ha-nyang.PNG" }
];
const PROJECT_RING_REPEAT = 6;
const PROJECT_RING = Array.from(
  { length: PROJECTS.length * PROJECT_RING_REPEAT },
  (_, ringIndex) => {
    const projectIndex = ringIndex % PROJECTS.length;
    return {
      ringIndex,
      projectIndex,
      title: PROJECTS[projectIndex].title,
      homepage: PROJECTS[projectIndex].homepage || "",
      sticker: PROJECTS[projectIndex].sticker || "",
    };
  },
);
const ABOUT_CONTENT = [
  { type: "line", column: "center", text: "What I like" },
  { type: "line", column: "right", text: "Rocket" },
  { type: "line", column: "right", text: "Coding" },
  { type: "line", column: "right", text: "Game" },
  { type: "line", column: "center", text: "" },
  { type: "line", column: "center", text: "Experience" },
  { type: "line", column: "right", text: "" },
  { type: "line", column: "right", text: "" },
  { type: "line", column: "center", text: "2025 - 2026" },
  { type: "line", column: "right", text: "NURA" },
  { type: "line", column: "center", text: "2024 -" },
  { type: "line", column: "right", text: "Hanyang Univ. ERICA" },
  { type: "line", column: "center", text: "2022 - 2024" },
  { type: "line", column: "right", text: "GJHS 36th" },
  { type: "line", column: "center", text: "2020 - 2022" },
  { type: "line", column: "right", text: "DAYDREAM 4th" },
];

const state = {
  source: null,
  sourceType: "",
  activeSection: "",
  dotNodes: [],
  frameWidth: 0,
  frameHeight: 0,
  lastFrame: null,
  rafId: 0,
  lastRenderAt: 0,
  projectNodes: [],
  aboutTextItems: [],
  contactTextItems: [],
  activeProjectIndex: 0,
  activeRingIndex: 0,
  dialRotation: 8,
  isDialDragging: false,
  didDialDrag: false,
  dragLastX: 0,
  dragLastY: 0,
  dragDistance: 0,
  wheelIdleTimer: 0,
  projectOrbitRafId: 0,
  projectOrbitLastAt: 0,
  projectOrbitIntroStartAt: 0,
  projectOrbitIntroFromRotation: 0,
  projectOrbitIntroToRotation: 0,
  projectOrbitTweenDuration: 760,
  lastProjectDialInteractionAt: 0,
  projectContrastSampleAt: 0,
  projectContrastInterval: 140,
  projectDialLayout: null,
  pendingProjectRingIndex: -1,
  pendingProjectPointerId: null,
  stickerVisible: false,
  navIntroScramblePlayed: false,
  navIntroScrambleRunning: false,
  navIntroScrambleRafId: 0,
  navIntroScrambleTimerId: 0,
  aboutIntroScrambleRafId: 0,
  aboutIntroScrambleTimerId: 0,
  contactIntroScrambleRafId: 0,
  contactIntroScrambleTimerId: 0,
  lizardSignalEffectEnabled: true,
};

const HOME_LIZARD_CONFIG = {
  scale: 2,
  segments: 45,
  segmentLength: 16,
  lineColor: "rgba(255, 255, 255, 0.88)",
  lineWidth: 1.05,
  maxSpeed: 12,
  maxBend: 0.4,
  centerBodyIndex: 16,
  frontLegIndex: 7,
  backLegIndex: 25,
};
const lizardState = {
  width: 0,
  height: 0,
  dpr: 1,
  maxDpr: 1.5,
  input: {
    mouse: {
      left: false,
      right: false,
      middle: false,
      x: 0,
      y: 0,
    },
  },
  hasPointerTarget: false,
  critter: null,
  nodes: [],
  points: [],
  renderPoints: [],
  legs: [],
  followTarget: { x: 0, y: 0 },
  anchor: { x: 0, y: 0 },
  parked: { x: 0, y: 0 },
  exitOrigin: { x: 0, y: 0 },
  mode: "parked",
  renderVisible: false,
  time: 0,
  speed: 0,
  walkCycle: 0,
  exitStartedAt: 0,
  exitTravelMs: 760,
  frameInterval: 16,
  lastFrameAt: 0,
  rafId: 0,
  running: false,
  visible: false,
};
const renderConfig = {
  maxDimension: 1200,
  dotsPerCell: 12,
  maxDotScale: 1.1,
  minDot: 0.85,
  videoFps: 14,
};
const contactRunnerState = {
  status: "inactive",
  speed: 0,
  startSpeed: 0,
  targetX: 0,
  transitionOriginX: 0,
  transitionProgress: 0,
  distance: 0,
  score: 0,
  bestScore: 0,
  milestoneFlashTimer: 0,
  milestoneFlashDuration: 0.72,
  milestoneFlashStep: 0.12,
  milestoneFlashValue: 0,
  lastMilestoneScore: 0,
  moonPhaseIndex: 0,
  moon: null,
  dinoY: 0,
  dinoVy: 0,
  groundY: 0,
  isDucking: false,
  obstacles: [],
  clouds: [],
  spawnTimer: 0,
  cloudSpawnTimer: 0,
  floorOffset: 0,
};
const contactRunnerAssets = {
  image: null,
  loaded: false,
};
const contactRunnerAudio = {
  context: null,
};

const contactDinoState = {
  width: 0,
  height: 0,
  dpr: 1,
  pointer: { x: 0, y: 0, inside: false, down: false },
  dino: null,
  anchor: { x: 0, y: 0 },
  parked: { x: 0, y: 0 },
  mode: "parked",
  renderVisible: false,
  visible: false,
  snoutViewport: { x: 0, y: 0 },
  waveRadius: 0,
  rafId: 0,
  lastAt: 0,
  signalEffectEnabled: true,
};
let lastDinoTapTime = 0;

async function initialize() {
  syncNavigationFromHash();

  const candidates = await discoverBackgroundCandidates();
  const loaded = await loadFirstAvailableMedia(candidates);

  if (!loaded) {
    paintBlankFrame();
    return;
  }

  state.source = loaded.element;
  state.sourceType = loaded.type;

  if (loaded.type === "video") {
    try {
      await loaded.element.play();
    } catch (error) {
      console.warn("Video autoplay was blocked.", error);
    }

    await renderCurrentSource();
    state.lastRenderAt = performance.now();
    runVideoLoop();
    return;
  }

  await renderCurrentSource();
}

async function discoverBackgroundCandidates() {
  const discovered = new Set(CONVENTIONAL_MEDIA);

  try {
    const response = await fetch("background/");
    if (response.ok) {
      const html = await response.text();
      extractMediaLinksFromDirectoryListing(html).forEach((url) => discovered.add(url));
    }
  } catch (error) {
    console.warn("Failed to inspect background directory.", error);
  }

  return [...discovered];
}

function extractMediaLinksFromDirectoryListing(html) {
  const parser = new DOMParser();
  const documentFragment = parser.parseFromString(html, "text/html");
  const links = [...documentFragment.querySelectorAll("a[href]")];

  return links
    .map((link) => link.getAttribute("href") || "")
    .filter((href) => isSupportedMediaPath(href))
    .map((href) => normalizeBackgroundUrl(href));
}

function normalizeBackgroundUrl(href) {
  const cleaned = href.replace(/^\.?\//, "");
  return cleaned.startsWith("background/") ? cleaned : `background/${cleaned}`;
}

function isSupportedMediaPath(path) {
  const normalized = path.toLowerCase();
  if (!normalized || normalized.endsWith("/")) return false;
  return [...IMAGE_EXTENSIONS, ...VIDEO_EXTENSIONS].some((extension) =>
    normalized.endsWith(extension),
  );
}

async function loadFirstAvailableMedia(candidates) {
  for (const candidate of candidates) {
    try {
      if (isVideoPath(candidate)) {
        const video = await loadVideo(candidate);
        return { element: video, type: "video", url: candidate };
      }

      if (isImagePath(candidate)) {
        const image = await loadImage(candidate);
        return { element: image, type: "image", url: candidate };
      }
    } catch (error) {
      console.warn(`Skipping unavailable media: ${candidate}`, error);
    }
  }

  return null;
}

function isImagePath(path) {
  const normalized = path.toLowerCase();
  return IMAGE_EXTENSIONS.some((extension) => normalized.endsWith(extension));
}

function isVideoPath(path) {
  const normalized = path.toLowerCase();
  return VIDEO_EXTENSIONS.some((extension) => normalized.endsWith(extension));
}

function loadImage(url) {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.decoding = "async";
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error(`Failed to load image: ${url}`));
    image.src = url;
  });
}

function loadVideo(url) {
  return new Promise((resolve, reject) => {
    const video = document.createElement("video");
    video.muted = true;
    video.loop = true;
    video.playsInline = true;
    video.preload = "auto";

    video.onloadeddata = () => resolve(video);
    video.onerror = () => reject(new Error(`Failed to load video: ${url}`));
    video.src = url;
  });
}

function runVideoLoop() {
  const tick = async (timestamp) => {
    if (state.sourceType !== "video" || !state.source) return;

    const source = state.source;
    const shouldRender =
      timestamp - state.lastRenderAt >= 1000 / renderConfig.videoFps &&
      source.readyState >= 2 &&
      !source.paused;

    if (shouldRender) {
      await renderCurrentSource();
      state.lastRenderAt = timestamp;
    }

    state.rafId = window.requestAnimationFrame(tick);
  };

  state.rafId = window.requestAnimationFrame(tick);
}

function renderCurrentSource() {
  if (!state.source) return;
  const frame = createHalftoneFrameData(state.source);
  state.lastFrame = frame;
  renderFrameToSvg(frame);
  updateNavButtonContrast(frame);
  updateProjectNodeContrast(frame);
}

function createHalftoneFrameData(source) {
  const dimensions = getSourceDimensions(source);
  const scale = Math.min(
    1,
    renderConfig.maxDimension / Math.max(dimensions.width, dimensions.height),
  );
  const width = Math.max(1, Math.round(dimensions.width * scale));
  const height = Math.max(1, Math.round(dimensions.height * scale));

  workerCanvas.width = width;
  workerCanvas.height = height;
  workerContext.clearRect(0, 0, width, height);
  workerContext.drawImage(source, 0, 0, width, height);

  const imageData = workerContext.getImageData(0, 0, width, height).data;
  const cols = Math.ceil(width / renderConfig.dotsPerCell);
  const rows = Math.ceil(height / renderConfig.dotsPerCell);
  const brightnessGrid = new Array(cols * rows);
  const dots = [];

  for (let row = 0, y = 0; y < height; row += 1, y += renderConfig.dotsPerCell) {
    for (let col = 0, x = 0; x < width; col += 1, x += renderConfig.dotsPerCell) {
      const tone = sampleCellTone(
        imageData,
        width,
        height,
        x,
        y,
        renderConfig.dotsPerCell,
      );
      brightnessGrid[row * cols + col] = tone.brightness;
      const darkness = 1 - tone.brightness / 255;
      if (darkness <= 0.02) continue;

      const radius = Math.max(
        renderConfig.minDot,
        (renderConfig.dotsPerCell * renderConfig.maxDotScale * darkness) / 2,
      );
      dots.push({
        cx: formatNumber(x + renderConfig.dotsPerCell / 2),
        cy: formatNumber(y + renderConfig.dotsPerCell / 2),
        r: formatNumber(radius),
        fill: rgbToCss(tone),
      });
    }
  }

  return {
    width,
    height,
    cols,
    rows,
    cellSize: renderConfig.dotsPerCell,
    brightnessGrid,
    dots,
  };
}

function paintBlankFrame() {
  state.dotNodes = [];
  state.frameWidth = 1;
  state.frameHeight = 1;
  state.lastFrame = null;
  screenSvg.setAttribute("viewBox", "0 0 1 1");
  screenSvg.replaceChildren(createSvgRect(1, 1));
  updateNavButtonContrast(null);
  updateProjectNodeContrast(null);
}

function syncNavigationFromHash() {
  const hash = window.location.hash.replace("#", "").toLowerCase();
  const fallback = navButtons[0]?.dataset.section || "home";
  const nextSection = navButtons.some((button) => button.dataset.section === hash)
    ? hash
    : fallback;

  setActiveSection(nextSection, false);
}

function setActiveSection(section, updateHash) {
  const previousSection = state.activeSection;
  state.activeSection = section;

  navButtons.forEach((button) => {
    const isActive = button.dataset.section === section;
    if (isActive) {
      button.setAttribute("aria-current", "page");
      return;
    }

    button.removeAttribute("aria-current");
  });

  if (updateHash) {
    window.location.hash = section;
  }

  updateSectionPanels(previousSection);
}

function updateSectionPanels(previousSection = "") {
  const showProjects = state.activeSection === "projects";
  const showAbout = state.activeSection === "about";
  const showContact = state.activeSection === "contact";
  projectsOrbit.classList.toggle("is-visible", showProjects);
  projectsOrbit.setAttribute("aria-hidden", String(!showProjects));
  projectsDial.setAttribute("aria-hidden", String(!showProjects));
  state.projectNodes.forEach((node) => {
    node.disabled = !showProjects;
    node.tabIndex = showProjects ? 0 : -1;
  });
  aboutPanel.classList.toggle("is-visible", showAbout);
  aboutPanel.setAttribute("aria-hidden", String(!showAbout));
  if (showAbout && previousSection !== "about") {
    queueAboutIntroScramble();
  }
  contactPanel.classList.toggle("is-visible", showContact);
  contactPanel.setAttribute("aria-hidden", String(!showContact));
  if (showContact && previousSection !== "contact") {
    queueContactIntroScramble();
  }
  lizardState.visible = state.activeSection === "home";
  if (showProjects && previousSection !== "projects") {
    state.lastProjectDialInteractionAt = performance.now() - 2600;
    scheduleProjectDialTween(state.dialRotation + 3.2, 920);
  } else if (!showProjects) {
    cancelProjectDialTween();
    projectsOrbit.classList.remove("is-auto-rotating");
  }
  updateHomeLizardState(previousSection);
  updateContactDinoState(previousSection);

  if (!showProjects) return;

  updateProjectDial(true);
}

function clampValue(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function lerpValue(a, b, t) {
  return a + (b - a) * t;
}

function easeInOutValue(t) {
  const clamped = clampValue(t, 0, 1);
  return clamped < 0.5
    ? 4 * clamped * clamped * clamped
    : 1 - Math.pow(-2 * clamped + 2, 3) / 2;
}

function prepareNavButtonLetters() {
  navButtons.forEach((button) => {
    if (button.dataset.fractureReady === "true") return;

    const text = (button.textContent || "").trim();
    button.dataset.fractureReady = "true";
    button.setAttribute("aria-label", text);

    const label = document.createElement("span");
    label.className = "nav-button-label";
    label.setAttribute("aria-hidden", "true");
    const charNodes = [];

    [...text].forEach((character, index) => {
      const char = document.createElement("span");
      char.className = `nav-button-char${character === " " ? " is-space" : ""}`;
      char.textContent = character === " " ? "\u00a0" : character;
      char.dataset.char = character;
      char.style.setProperty("--fracture-index", String(index));
      label.append(char);
      charNodes.push(char);
    });

    button.textContent = "";
    button.append(label);
    button._navChars = charNodes;
    navFractureState.set(button, { intensity: 0, impactX: 0, impactY: 0, active: false });
  });

  invalidateNavFractureMetrics();
}

function queueNavIntroScramble() {
  if (state.navIntroScramblePlayed || state.navIntroScrambleRunning) return;

  if (state.navIntroScrambleTimerId) {
    window.clearTimeout(state.navIntroScrambleTimerId);
    state.navIntroScrambleTimerId = 0;
  }

  const start = () => {
    state.navIntroScrambleTimerId = 0;
    if (state.navIntroScramblePlayed || state.navIntroScrambleRunning) return;
    runNavIntroScramble();
  };

  const schedule = () => {
    state.navIntroScrambleTimerId = window.setTimeout(() => {
      window.requestAnimationFrame(start);
    }, 260);
  };

  if (document.fonts?.ready) {
    document.fonts.ready.then(schedule);
    return;
  }

  schedule();
}

function runNavIntroScramble() {
  if (state.navIntroScramblePlayed || state.navIntroScrambleRunning) return;

  const labels = navButtons
    .map((button) => getNavButtonChars(button))
    .filter((chars) => chars.length);

  if (!labels.length) return;

  state.navIntroScrambleRunning = true;
  state.navIntroScrambleRafId = scrambleCharacterGroups(labels, {
    groupDelay: 72,
    scrambleWindow: 360,
    revealStep: 28,
    initialStride: 5,
    setFrameId: (frameId) => {
      state.navIntroScrambleRafId = frameId;
    },
    onComplete: () => {
      state.navIntroScramblePlayed = true;
      state.navIntroScrambleRunning = false;
      state.navIntroScrambleRafId = 0;
      invalidateNavFractureMetrics();
    },
  });
}


function prepareWrappedTextLetters(
  items,
  { stateKey, readyFlag, charsProperty, onReady = null },
) {
  const textItems = [...items];
  state[stateKey] = textItems;

  textItems.forEach((item) => {
    if (item.dataset[readyFlag] === "true") return;

    const text = (item.textContent || "").trim();
    item.dataset[readyFlag] = "true";
    const label = document.createElement("span");
    label.className = "contact-text-label";
    label.setAttribute("aria-hidden", "true");
    const charNodes = [];

    [...text].forEach((character) => {
      const char = document.createElement("span");
      char.className = `contact-text-char${character === " " ? " is-space" : ""}`;
      char.textContent = character === " " ? "\u00a0" : character;
      char.dataset.char = character;
      label.append(char);
      charNodes.push(char);
    });

    item.setAttribute("aria-label", text);
    item.textContent = "";
    item.append(label);
    item[charsProperty] = charNodes;
    onReady?.(item);
  });
}

function getNavButtonChars(button) {
  if (button._navChars) return button._navChars;
  button._navChars = [...button.querySelectorAll(".nav-button-char")];
  return button._navChars;
}

function getWrappedTextChars(item, charsProperty) {
  if (item[charsProperty]) return item[charsProperty];
  item[charsProperty] = [...item.querySelectorAll(".contact-text-char")];
  return item[charsProperty];
}

function setNodeTextValue(node, value) {
  if (node.__displayText === value) return;
  node.textContent = value;
  node.__displayText = value;
}

function setNodeStyleValue(node, property, value) {
  if (!node.__styleValueCache) {
    node.__styleValueCache = Object.create(null);
  }

  if (node.__styleValueCache[property] === value) return;
  node.style.setProperty(property, value);
  node.__styleValueCache[property] = value;
}

function clearNodeStyleValue(node, property) {
  if (!node.__styleValueCache || !(property in node.__styleValueCache)) return;
  node.style.removeProperty(property);
  delete node.__styleValueCache[property];
}

function getStaticCharValue(node) {
  return node.classList.contains("is-space") ? "\u00a0" : node.dataset.char || "";
}

function resetNavTextNode(node) {
  setNodeTextValue(node, getStaticCharValue(node));
  clearNodeStyleValue(node, "--fracture-x");
  clearNodeStyleValue(node, "--fracture-y");
  clearNodeStyleValue(node, "--fracture-rotate");
  clearNodeStyleValue(node, "--fracture-opacity");
  clearNodeStyleValue(node, "--fracture-blur");
}

function queueTextIntroScramble({
  items,
  getChars,
  timerKey,
  rafKey,
  revealDirection = "auto",
}) {
  if (!items.length) return;

  if (state[timerKey]) {
    window.clearTimeout(state[timerKey]);
    state[timerKey] = 0;
  }

  if (state[rafKey]) {
    window.cancelAnimationFrame(state[rafKey]);
    state[rafKey] = 0;
  }

  items.forEach((item) => {
    getChars(item).forEach((char) => {
      if (char.classList.contains("is-space")) return;
      setNodeTextValue(char, char.dataset.char || "");
    });
  });

  state[timerKey] = window.setTimeout(() => {
    state[timerKey] = 0;
    runTextIntroScramble({ items, getChars, rafKey, revealDirection });
  }, 120);
}

function runTextIntroScramble({
  items,
  getChars,
  rafKey,
  revealDirection = "auto",
}) {
  const groups = items
    .map((item) => getChars(item))
    .filter((chars) => chars.length);

  if (!groups.length) return;

  state[rafKey] = scrambleCharacterGroups(groups, {
    groupDelay: 56,
    scrambleWindow: 300,
    revealStep: 24,
    revealDirection,
    initialStride: 4,
    setFrameId: (frameId) => {
      state[rafKey] = frameId;
    },
    onComplete: () => {
      state[rafKey] = 0;
    },
  });
}

function scrambleCharacterGroups(
  groups,
  {
    groupDelay = 72,
    scrambleWindow = 360,
    revealStep = 28,
    revealDirection = "auto",
    initialStride = 5,
    cycleStep = 34,
    frameIntervalMs = 0,
    setFrameId = null,
    onComplete,
  } = {},
) {
  const entries = groups
    .filter((chars) => chars.length)
    .map((chars, groupIndex) => ({
      chars,
      revealStart: groupIndex * groupDelay,
      revealRanks: getScrambleRevealRanks(chars, revealDirection),
      revealCount: chars.filter((char) => !char.classList.contains("is-space")).length,
    }));

  if (!entries.length) {
    onComplete?.();
    return 0;
  }

  const startedAt = performance.now();
  let lastPaintAt = startedAt - frameIntervalMs;

  entries.forEach(({ chars }, groupIndex) => {
    chars.forEach((char, index) => {
      if (char.classList.contains("is-space")) return;
      setNodeTextValue(char, char.dataset.char || "");
      setNodeStyleValue(char, "opacity", "0");
    });
  });

  const tick = (now) => {
    if (frameIntervalMs > 0 && now - lastPaintAt < frameIntervalMs) {
      const throttledFrameId = window.requestAnimationFrame(tick);
      setFrameId?.(throttledFrameId);
      return;
    }

    lastPaintAt = now;
    let doneCount = 0;

    entries.forEach(({ chars, revealStart, revealRanks, revealCount: totalRevealCount }) => {
      const elapsed = now - startedAt - revealStart;

      chars.forEach((char, index) => {
        if (char.classList.contains("is-space")) return;

        const original = char.dataset.char || "";
        const revealRank = revealRanks[index];
        const revealAt = Math.max(0, revealRank) * revealStep;
        const localElapsed = elapsed - revealAt;

        if (localElapsed < 0) {
          setNodeTextValue(char, original);
          setNodeStyleValue(char, "opacity", "0");
          return;
        }

        setNodeStyleValue(char, "opacity", "1");

        if (localElapsed >= scrambleWindow) {
          setNodeTextValue(char, original);
          return;
        }

        const sequenceOffset = Math.max(
          0,
          Math.floor(localElapsed / Math.max(12, cycleStep)),
        );
        const glyphIndex =
          (revealStart + index * initialStride + sequenceOffset) %
          NAV_SCRAMBLE_GLYPHS.length;
        setNodeTextValue(char, NAV_SCRAMBLE_GLYPHS[glyphIndex]);
      });

      const lastRevealRank = totalRevealCount - 1;
      if (elapsed >= scrambleWindow + Math.max(0, lastRevealRank) * revealStep) {
        doneCount += 1;
      }
    });

    if (doneCount >= entries.length) {
      entries.forEach(({ chars }) => {
        chars.forEach((char) => {
          if (char.classList.contains("is-space")) return;
          setNodeTextValue(char, char.dataset.char || "");
          clearNodeStyleValue(char, "opacity");
        });
      });
      onComplete?.();
      return;
    }

    const nextFrameId = window.requestAnimationFrame(tick);
    setFrameId?.(nextFrameId);
  };

  const firstFrameId = window.requestAnimationFrame(tick);
  setFrameId?.(firstFrameId);
  return firstFrameId;
}

function getScrambleRevealRanks(chars, direction = "auto") {
  const nonSpaceChars = chars.filter((char) => !char.classList.contains("is-space"));
  const revealRanks = new Array(chars.length).fill(-1);
  if (!nonSpaceChars.length) return revealRanks;

  let leftToRight = true;

  if (direction === "rtl") {
    leftToRight = false;
  } else if (direction === "ltr") {
    leftToRight = true;
  } else {
    const firstRect = nonSpaceChars[0].getBoundingClientRect();
    const lastRect = nonSpaceChars[nonSpaceChars.length - 1].getBoundingClientRect();
    const leftDistance = firstRect.left;
    const rightDistance = window.innerWidth - lastRect.right;
    leftToRight = leftDistance <= rightDistance;
  }

  let seen = 0;
  chars.forEach((char, index) => {
    if (char.classList.contains("is-space")) return;
    revealRanks[index] = leftToRight ? seen : nonSpaceChars.length - 1 - seen;
    seen += 1;
  });

  return revealRanks;
}

function getScrambleTargetIndex(character) {
  if (!character) return -1;
  return NAV_SCRAMBLE_GLYPHS.indexOf(character.toLowerCase());
}

function getScrambleProgressChar(character, step) {
  if (!character) return "";

  const targetIndex = getScrambleTargetIndex(character);
  if (targetIndex < 0) {
    return character;
  }

  const isUppercase =
    character.toUpperCase() === character && character.toLowerCase() !== character;
  const glyph = NAV_SCRAMBLE_GLYPHS[clampValue(step, 0, targetIndex)] || character;

  if (isUppercase && glyph >= "a" && glyph <= "z") {
    return glyph.toUpperCase();
  }

  return glyph;
}

function resolveSignalScrambleChar(original, index, signal, timeSource, sequenceOffset = 0) {
  if (!original) return "";

  const normalizedSignal = clampValue(signal, 0, 1);
  if (normalizedSignal < 0.08) {
    return original;
  }

  const targetIndex = getScrambleTargetIndex(original);
  if (targetIndex <= 0) {
    return original;
  }

  const frame = Math.floor(timeSource / 96);
  const cycleLength = targetIndex + 3;
  const cycleStep = (frame + sequenceOffset + index) % cycleLength;

  if (cycleStep > targetIndex) {
    return original;
  }

  const visibleDepth = Math.max(1, Math.round(normalizedSignal * (targetIndex + 1)));
  return getScrambleProgressChar(original, Math.min(cycleStep, visibleDepth - 1));
}


function restoreNavEffectText() {
  navButtons.forEach((button) => {
    button.classList.remove("is-fractured");
    getNavButtonChars(button).forEach(resetNavTextNode);
    const fracture = navFractureState.get(button);
    if (fracture) fracture.active = false;
  });
}

function renderFrameToSvg(frame) {
  const needsRebuild =
    state.frameWidth !== frame.width ||
    state.frameHeight !== frame.height ||
    state.dotNodes.length !== frame.dots.length;

  if (needsRebuild) {
    rebuildSvgFrame(frame);
    return;
  }

  for (let index = 0; index < frame.dots.length; index += 1) {
    state.dotNodes[index].setAttribute("r", String(frame.dots[index].r));
    state.dotNodes[index].setAttribute("fill", frame.dots[index].fill);
  }
}

function rebuildSvgFrame(frame) {
  state.frameWidth = frame.width;
  state.frameHeight = frame.height;
  screenSvg.setAttribute("viewBox", `0 0 ${frame.width} ${frame.height}`);

  const fragment = document.createDocumentFragment();
  fragment.append(createSvgRect(frame.width, frame.height));

  state.dotNodes = frame.dots.map((dot) => {
    const circle = document.createElementNS(SVG_NS, "circle");
    circle.setAttribute("cx", String(dot.cx));
    circle.setAttribute("cy", String(dot.cy));
    circle.setAttribute("r", String(dot.r));
    circle.setAttribute("fill", dot.fill);
    fragment.append(circle);
    return circle;
  });

  screenSvg.replaceChildren(fragment);
}

function updateNavButtonContrast(frame) {
  if (!frame) {
    navButtons.forEach((button) => button.setAttribute("data-contrast", "dark"));
    return;
  }

  navButtons.forEach((button) => {
    const brightness = sampleBrightnessBehindElement(button, frame);
    const currentContrast = button.getAttribute("data-contrast") || "dark";
    const nextContrast = getStableContrastMode(brightness, currentContrast);
    button.setAttribute("data-contrast", nextContrast);
  });
}

function updateProjectNodeContrast(frame) {
  if (!state.projectNodes.length) return;

  if (!frame) {
    state.projectNodes.forEach((node) => node.setAttribute("data-contrast", "dark"));
    state.projectContrastSampleAt = 0;
    return;
  }

  if (state.activeSection !== "projects") return;

  const now = performance.now();
  if (now - state.projectContrastSampleAt < state.projectContrastInterval) return;

  state.projectNodes.forEach((node) => {
    const brightness = sampleBrightnessBehindElement(node, frame);
    const currentContrast = node.getAttribute("data-contrast") || "dark";
    const nextContrast = getStableContrastMode(brightness, currentContrast);
    node.setAttribute("data-contrast", nextContrast);
  });
  state.projectContrastSampleAt = now;
}

function sampleBrightnessBehindElement(element, frame) {
  const rect = element.getBoundingClientRect();
  const samplePoints = [
    [rect.left + rect.width * 0.5, rect.top + rect.height * 0.5],
    [rect.left + rect.width * 0.2, rect.top + rect.height * 0.5],
    [rect.left + rect.width * 0.8, rect.top + rect.height * 0.5],
  ];

  let total = 0;
  let count = 0;

  for (const [clientX, clientY] of samplePoints) {
    const mapped = mapViewportPointToFrame(clientX, clientY, frame.width, frame.height);
    if (!mapped) continue;

    total += readBrightnessGrid(frame, mapped.x, mapped.y);
    count += 1;
  }

  return count > 0 ? total / count : 255;
}

function mapViewportPointToFrame(clientX, clientY, frameWidth, frameHeight) {
  const viewportWidth = window.innerWidth;
  const viewportHeight = window.innerHeight;
  const sourceAspect = frameWidth / frameHeight;
  const viewportAspect = viewportWidth / viewportHeight;

  let drawWidth = viewportWidth;
  let drawHeight = viewportHeight;
  let offsetX = 0;
  let offsetY = 0;

  if (sourceAspect > viewportAspect) {
    drawHeight = viewportHeight;
    drawWidth = drawHeight * sourceAspect;
    offsetX = (viewportWidth - drawWidth) / 2;
  } else {
    drawWidth = viewportWidth;
    drawHeight = drawWidth / sourceAspect;
    offsetY = (viewportHeight - drawHeight) / 2;
  }

  const frameX = ((clientX - offsetX) / drawWidth) * frameWidth;
  const frameY = ((clientY - offsetY) / drawHeight) * frameHeight;

  if (frameX < 0 || frameX > frameWidth || frameY < 0 || frameY > frameHeight) {
    return null;
  }

  return { x: frameX, y: frameY };
}

function readBrightnessGrid(frame, x, y) {
  const col = clamp(Math.floor(x / frame.cellSize), 0, frame.cols - 1);
  const row = clamp(Math.floor(y / frame.cellSize), 0, frame.rows - 1);
  const index = row * frame.cols + col;
  return frame.brightnessGrid[index] ?? 255;
}

function getStableContrastMode(brightness, currentContrast) {
  const lowerThreshold = 112;
  const upperThreshold = 168;

  if (currentContrast === "light") {
    return brightness > upperThreshold ? "dark" : "light";
  }

  return brightness < lowerThreshold ? "light" : "dark";
}

function createSvgRect(width, height) {
  const rect = document.createElementNS(SVG_NS, "rect");
  rect.setAttribute("width", String(width));
  rect.setAttribute("height", String(height));
  rect.setAttribute("fill", "#ffffff");
  return rect;
}

function getSourceDimensions(source) {
  if (source instanceof HTMLVideoElement) {
    return {
      width: source.videoWidth || source.clientWidth || 1,
      height: source.videoHeight || source.clientHeight || 1,
    };
  }

  return {
    width: source.naturalWidth || source.width || 1,
    height: source.naturalHeight || source.height || 1,
  };
}

function sampleCellTone(data, width, height, startX, startY, size) {
  let totalBrightness = 0;
  let totalR = 0;
  let totalG = 0;
  let totalB = 0;
  let count = 0;

  const endX = Math.min(startX + size, width);
  const endY = Math.min(startY + size, height);

  for (let y = startY; y < endY; y += 1) {
    for (let x = startX; x < endX; x += 1) {
      const index = (y * width + x) * 4;
      const r = data[index];
      const g = data[index + 1];
      const b = data[index + 2];
      totalBrightness += 0.299 * r + 0.587 * g + 0.114 * b;
      totalR += r;
      totalG += g;
      totalB += b;
      count += 1;
    }
  }

  if (count === 0) {
    return { brightness: 255, r: 255, g: 255, b: 255 };
  }

  return {
    brightness: totalBrightness / count,
    r: totalR / count,
    g: totalG / count,
    b: totalB / count,
  };
}

function formatNumber(value) {
  return Number(value.toFixed(2));
}

function rgbToCss(color) {
  return `rgb(${Math.round(color.r)}, ${Math.round(color.g)}, ${Math.round(color.b)})`;
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function cleanupSource() {
  if (state.wheelIdleTimer) {
    window.clearTimeout(state.wheelIdleTimer);
    state.wheelIdleTimer = 0;
  }

  if (state.rafId) {
    window.cancelAnimationFrame(state.rafId);
  }

  if (state.projectOrbitRafId) {
    window.cancelAnimationFrame(state.projectOrbitRafId);
    state.projectOrbitRafId = 0;
  }

  if (state.sourceType === "video" && state.source) {
    state.source.pause();
    state.source.removeAttribute("src");
    state.source.load();
  }

}
