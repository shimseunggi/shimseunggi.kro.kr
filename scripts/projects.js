function initializeProjectDial() {
  state.projectNodes = PROJECT_RING.map((entry) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "projects-node";
    button.dataset.ringIndex = String(entry.ringIndex);
    if (entry.homepage) {
      button.setAttribute("data-has-homepage", "true");
      button.title = entry.homepage;
    }
    if (entry.sticker) {
      button.setAttribute("data-has-sticker", "true");
    }
    button.innerHTML = `
      <span class="projects-node-title">${entry.title}</span>
    `;
    button.addEventListener("pointerdown", (event) => {
      state.pendingProjectRingIndex = entry.ringIndex;
      state.pendingProjectPointerId = event.pointerId;
    });
    button.addEventListener("click", (event) => {
      if (state.activeSection !== "projects") return;
      if (event.detail !== 0) return;
      activateProjectEntry(entry);
    });
    button._dialRenderState = {
      left: "",
      top: "",
      opacity: "",
      transform: "",
      zIndex: "",
      active: false,
    };
    projectsDial.append(button);
    return button;
  });

  projectsDial.addEventListener("pointerdown", handleDialPointerDown);
  projectsDial.addEventListener("pointermove", handleDialPointerMove);
  projectsDial.addEventListener("pointerup", handleDialPointerUp);
  projectsDial.addEventListener("pointercancel", handleDialPointerUp);
  projectsDial.addEventListener("lostpointercapture", handleDialPointerUp);
  projectsOrbit.addEventListener("wheel", handleDialWheel, { passive: false });
  projectsDial.addEventListener("wheel", handleDialWheel, { passive: false });
  projectsDial.addEventListener("keydown", handleDialKeydown);

  updateProjectDialLayout();
  updateProjectDial();
  schedulePretextLayout();
  startProjectAutoRotateTimer();
}

function handleDialPointerDown(event) {
  if (state.activeSection !== "projects") return;

  const projectButton = event.target.closest(".projects-node");
  state.pendingProjectRingIndex = projectButton
    ? Number.parseInt(projectButton.dataset.ringIndex || "-1", 10)
    : -1;
  state.pendingProjectPointerId = event.pointerId ?? null;
  markProjectDialInteraction();
  cancelProjectDialTween();
  projectsOrbit.classList.remove("is-auto-rotating");
  state.isDialDragging = true;
  state.didDialDrag = false;
  state.dragLastX = event.clientX;
  state.dragLastY = event.clientY;
  state.dragDistance = 0;
  projectsOrbit.classList.add("is-dragging");
  projectsDial.setPointerCapture(event.pointerId);
}

function handleDialPointerMove(event) {
  if (!state.isDialDragging) return;

  const geometry = getDialGeometry();
  if (!geometry) return;

  const deltaX = event.clientX - state.dragLastX;
  const deltaY = event.clientY - state.dragLastY;
  state.dragLastX = event.clientX;
  state.dragLastY = event.clientY;
  state.dragDistance += Math.hypot(deltaX, deltaY);

  const fromCenterX = event.clientX - geometry.centerX;
  const fromCenterY = event.clientY - geometry.centerY;
  const tangentX = -fromCenterY;
  const tangentY = fromCenterX;
  const tangentLength = Math.hypot(tangentX, tangentY) || 1;
  const projectedDelta =
    deltaX * (tangentX / tangentLength) + deltaY * (tangentY / tangentLength);
  const rotationDelta =
    ((projectedDelta / Math.max(geometry.radius, 1)) * 180 * 1.35) / Math.PI;

  markProjectDialInteraction();
  state.dialRotation += rotationDelta;
  state.didDialDrag = state.dragDistance > 6;
  if (state.didDialDrag) {
    state.pendingProjectRingIndex = -1;
    state.pendingProjectPointerId = null;
  }
  updateProjectDial();
}

function handleDialPointerUp(event) {
  if (!state.isDialDragging) return;

  const shouldActivatePendingProject =
    !state.didDialDrag &&
    state.pendingProjectRingIndex >= 0 &&
    (state.pendingProjectPointerId == null || state.pendingProjectPointerId === event?.pointerId);
  const pendingEntry = shouldActivatePendingProject
    ? PROJECT_RING[state.pendingProjectRingIndex] || null
    : null;

  state.isDialDragging = false;
  projectsOrbit.classList.remove("is-dragging");
  if (event?.pointerId != null && projectsDial.hasPointerCapture(event.pointerId)) {
    projectsDial.releasePointerCapture(event.pointerId);
  }

  markProjectDialInteraction();
  state.pendingProjectRingIndex = -1;
  state.pendingProjectPointerId = null;

  if (pendingEntry) {
    activateProjectEntry(pendingEntry);
  } else {
    snapDialToNearestProject();
  }

  window.setTimeout(() => {
    state.didDialDrag = false;
  }, 0);
}

function handleDialWheel(event) {
  if (state.activeSection !== "projects") return;

  event.preventDefault();
  markProjectDialInteraction();
  cancelProjectDialTween();
  projectsOrbit.classList.remove("is-auto-rotating");
  beginWheelScrolling();
  const modeScale =
    event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? window.innerHeight : 1;
  const primaryDelta = Math.abs(event.deltaY) >= Math.abs(event.deltaX) ? event.deltaY : event.deltaX;
  const rotationDelta = primaryDelta * modeScale * 0.038;

  if (Math.abs(rotationDelta) < 0.2) return;

  state.dialRotation += rotationDelta;
  updateProjectDial();
  scheduleWheelSnap();
}

function handleDialKeydown(event) {
  if (state.activeSection !== "projects") return;

  if (event.key !== "ArrowUp" && event.key !== "ArrowDown" && event.key !== "ArrowLeft" && event.key !== "ArrowRight") {
    return;
  }

  event.preventDefault();
  markProjectDialInteraction();
  const direction = event.key === "ArrowUp" || event.key === "ArrowLeft" ? -1 : 1;
  snapDialToRingIndex(modulo(state.activeRingIndex + direction, PROJECT_RING.length));
}

function applyProjectNodeRender(node, { left, top, opacity, transform, zIndex, isActive }) {
  const renderState =
    node._dialRenderState ||
    (node._dialRenderState = {
      left: "",
      top: "",
      opacity: "",
      transform: "",
      zIndex: "",
      active: false,
    });

  if (renderState.left !== left) {
    node.style.left = left;
    renderState.left = left;
  }

  if (renderState.top !== top) {
    node.style.top = top;
    renderState.top = top;
  }

  if (renderState.opacity !== opacity) {
    node.style.opacity = opacity;
    renderState.opacity = opacity;
  }

  if (renderState.transform !== transform) {
    node.style.transform = transform;
    renderState.transform = transform;
  }

  if (renderState.zIndex !== zIndex) {
    node.style.zIndex = zIndex;
    renderState.zIndex = zIndex;
  }

  if (renderState.active !== isActive) {
    node.classList.toggle("is-active", isActive);
    renderState.active = isActive;
  }

  node.style.visibility = "visible";
  node.style.pointerEvents = "auto";
}

function updateProjectDial(instant = false) {
  if (!state.projectNodes.length) return;

  const layout = state.projectDialLayout || updateProjectDialLayout();
  if (!layout) return;

  const centerX = layout.width / 2;
  const centerY = layout.height / 2;
  const radius = layout.radius;
  const angleStep = 360 / PROJECT_RING.length;
  const focusAngle = 180;
  const isAutoRotating =
    projectsOrbit.classList.contains("is-auto-rotating") &&
    !state.isDialDragging &&
    !projectsOrbit.classList.contains("is-wheel-scrolling");
  let closestRingIndex = state.activeRingIndex;
  let closestDistance = Infinity;

  state.projectNodes.forEach((node, index) => {
    const angle = normalizeAngle(state.dialRotation + angleStep * index);
    const radians = (angle * Math.PI) / 180;
    const frontness = (Math.cos(((angle - focusAngle) * Math.PI) / 180) + 1) / 2;
    const renderFrontness = isAutoRotating
      ? snapProjectDialValue(frontness, 0.05)
      : frontness;
    const x = snapProjectDialValue(centerX + radius * Math.cos(radians), isAutoRotating ? 1 : 0.25);
    const y = snapProjectDialValue(centerY + radius * Math.sin(radians), isAutoRotating ? 1 : 0.25);
    const scale = 1;
    const opacity = isAutoRotating
      ? snapProjectDialValue(0.28 + renderFrontness * 0.58, 0.03)
      : 0.14 + renderFrontness * 0.82;
    const distance = angularDistance(angle, focusAngle);

    if (distance < closestDistance) {
      closestDistance = distance;
      closestRingIndex = index;
    }

    applyProjectNodeRender(node, {
      left: `${x.toFixed(3)}px`,
      top: `${y.toFixed(3)}px`,
      opacity: opacity.toFixed(3),
      transform: `translate3d(-100%, -50%, 0) scale(${scale.toFixed(3)})`,
      zIndex: String(Math.round(renderFrontness * 100)),
      isActive: index === closestRingIndex,
    });

    if (instant) {
      node.getBoundingClientRect();
    }
  });

  state.activeRingIndex = closestRingIndex;
  state.activeProjectIndex = PROJECT_RING[closestRingIndex]?.projectIndex ?? 0;
  state.projectNodes.forEach((node, index) => {
    node.classList.toggle("is-active", index === closestRingIndex);
  });
  if (instant) {
    state.projectContrastSampleAt = 0;
  }
  updateProjectNodeContrast(state.lastFrame);
}

function runProjectOrbitLoop(timestamp) {
  const dt = state.projectOrbitLastAt
    ? Math.min(0.05, (timestamp - state.projectOrbitLastAt) / 1000)
    : 0.016;
  state.projectOrbitLastAt = timestamp;

  const canAutoRotate =
    projectsOrbit.classList.contains("is-visible") &&
    !state.isDialDragging &&
    !projectsOrbit.classList.contains("is-wheel-scrolling");

  if (canAutoRotate && state.projectOrbitIntroToRotation !== state.projectOrbitIntroFromRotation) {
    if (!state.projectOrbitIntroStartAt) {
      state.projectOrbitIntroStartAt = timestamp;
    }

    const introDuration = state.projectOrbitTweenDuration || 760;
    const elapsed = timestamp - state.projectOrbitIntroStartAt;
    const progress = Math.max(0, Math.min(1, elapsed / introDuration));
    const eased = easeInOutSine(progress);
    state.dialRotation =
      state.projectOrbitIntroFromRotation +
      (state.projectOrbitIntroToRotation - state.projectOrbitIntroFromRotation) * eased;
    projectsOrbit.classList.add("is-auto-rotating");
    updateProjectDial();

    if (progress >= 1) {
      cancelProjectDialTween();
    }
  } else if (canAutoRotate) {
    state.dialRotation += dt * state.projectOrbitAutoRotateSpeed;
    projectsOrbit.classList.add("is-auto-rotating");
    updateProjectDial();
  } else {
    projectsOrbit.classList.remove("is-auto-rotating");
  }

  state.projectOrbitRafId = window.requestAnimationFrame(runProjectOrbitLoop);
}

function startProjectAutoRotateTimer() {
  if (state.projectOrbitAutoRotateTimerId) return;

  let lastTickAt = performance.now();
  state.projectOrbitAutoRotateTimerId = window.setInterval(() => {
    const now = performance.now();
    const dt = Math.min(0.08, (now - lastTickAt) / 1000);
    lastTickAt = now;

    if (!projectsOrbit.classList.contains("is-visible")) return;
    if (state.isDialDragging || projectsOrbit.classList.contains("is-wheel-scrolling")) return;
    if (state.projectOrbitIntroToRotation !== state.projectOrbitIntroFromRotation) return;

    state.dialRotation += dt * state.projectOrbitAutoRotateSpeed;
    projectsOrbit.classList.add("is-auto-rotating");
    updateProjectDial();
  }, 33);
}

function markProjectDialInteraction(at = performance.now()) {
  state.lastProjectDialInteractionAt = at;
}

function scheduleProjectDialTween(targetRotation, duration = 760) {
  state.projectOrbitIntroStartAt = 0;
  state.projectOrbitIntroFromRotation = state.dialRotation;
  state.projectOrbitIntroToRotation = targetRotation;
  state.projectOrbitTweenDuration = duration;
}

function cancelProjectDialTween() {
  state.projectOrbitIntroStartAt = 0;
  state.projectOrbitIntroFromRotation = state.dialRotation;
  state.projectOrbitIntroToRotation = state.dialRotation;
}

function activateProjectEntry(entry) {
  if (!entry || state.activeSection !== "projects") return;

  markProjectDialInteraction();
  if (entry.homepage) {
    openProjectHomepage(entry.homepage);
    return;
  }
  if (entry.sticker) {
    showSticker(entry.sticker, entry.title);
    return;
  }
  snapDialToRingIndex(entry.ringIndex);
}

function snapDialToNearestProject() {
  snapDialToRingIndex(state.activeRingIndex);
}

function snapDialToRingIndex(ringIndex, duration = 460) {
  const normalizedRingIndex = modulo(ringIndex, PROJECT_RING.length);
  const angleStep = 360 / PROJECT_RING.length;
  const targetRotation = closestEquivalentRotation(
    180 - angleStep * normalizedRingIndex,
    state.dialRotation,
  );
  scheduleProjectDialTween(targetRotation, duration);
  state.activeRingIndex = normalizedRingIndex;
  state.activeProjectIndex = PROJECT_RING[normalizedRingIndex]?.projectIndex ?? 0;
  updateProjectDial();
}

function openProjectHomepage(homepage) {
  if (!homepage) return;
  window.open(homepage, "_blank", "noopener,noreferrer");
}

function showSticker(path, title) {
  if (!path) return;

  stickerImage.src = path;
  stickerImage.alt = `${title} sticker`;
  stickerCard.style.setProperty("--sticker-image-url", `url("${path}")`);
  resetStickerTilt();
  stickerStage.classList.remove("is-active");
  void stickerStage.offsetWidth;
  stickerStage.classList.add("is-active");
  stickerStage.setAttribute("aria-hidden", "false");
  state.stickerVisible = true;
}

function hideSticker() {
  stickerStage.classList.remove("is-active");
  stickerStage.setAttribute("aria-hidden", "true");
  state.stickerVisible = false;
  resetStickerTilt();
}

function handleStickerPointerMove(event) {
  const rect = stickerCard.getBoundingClientRect();
  const px = clamp((event.clientX - rect.left) / rect.width, 0, 1);
  const py = clamp((event.clientY - rect.top) / rect.height, 0, 1);
  const deltaX = px - 0.5;
  const deltaY = py - 0.5;
  const rotateY = deltaX * 26;
  const rotateX = deltaY * -24;
  const distance = Math.min(Math.hypot(deltaX, deltaY) / 0.70710678118, 1);

  stickerCard.style.setProperty("--sticker-rotate-x", `${rotateX.toFixed(2)}deg`);
  stickerCard.style.setProperty("--sticker-rotate-y", `${rotateY.toFixed(2)}deg`);
  stickerCard.style.setProperty("--sticker-scale", "1.08");
  stickerCard.style.setProperty("--sticker-pointer-x", `${(px * 100).toFixed(2)}%`);
  stickerCard.style.setProperty("--sticker-pointer-y", `${(py * 100).toFixed(2)}%`);
  stickerCard.style.setProperty("--sticker-glare-x", `${(18 + px * 64).toFixed(2)}%`);
  stickerCard.style.setProperty("--sticker-glare-y", `${(14 + py * 72).toFixed(2)}%`);
  stickerCard.style.setProperty("--sticker-distance", distance.toFixed(3));
}

function resetStickerTilt() {
  stickerCard.style.setProperty("--sticker-rotate-x", "0deg");
  stickerCard.style.setProperty("--sticker-rotate-y", "0deg");
  stickerCard.style.setProperty("--sticker-scale", "1");
  stickerCard.style.setProperty("--sticker-pointer-x", "50%");
  stickerCard.style.setProperty("--sticker-pointer-y", "50%");
  stickerCard.style.setProperty("--sticker-glare-x", "50%");
  stickerCard.style.setProperty("--sticker-glare-y", "50%");
  stickerCard.style.setProperty("--sticker-distance", "0");
}

function beginWheelScrolling() {
  projectsOrbit.classList.add("is-wheel-scrolling");
}

function scheduleWheelSnap() {
  if (state.wheelIdleTimer) {
    window.clearTimeout(state.wheelIdleTimer);
    state.wheelIdleTimer = 0;
  }

  state.wheelIdleTimer = window.setTimeout(() => {
    projectsOrbit.classList.remove("is-wheel-scrolling");
    snapDialToNearestProject();
    state.wheelIdleTimer = 0;
  }, 220);
}

function getDialGeometry() {
  const rect = state.projectDialLayout || updateProjectDialLayout();
  if (!rect.width || !rect.height) return null;

  return {
    rect,
    centerX: rect.centerX,
    centerY: rect.centerY,
    radius: rect.radius,
  };
}

function updateProjectDialLayout() {
  const rect = projectsDial.getBoundingClientRect();
  if (!rect.width || !rect.height) {
    state.projectDialLayout = null;
    return null;
  }

  state.projectDialLayout = {
    left: rect.left,
    top: rect.top,
    width: rect.width,
    height: rect.height,
    centerX: rect.left + rect.width / 2,
    centerY: rect.top + rect.height / 2,
    radius: Math.min(rect.width, rect.height) * (window.innerWidth > 900 ? 0.42 : 0.35),
  };
  return state.projectDialLayout;
}

function normalizeAngle(angle) {
  let normalized = angle % 360;
  if (normalized > 180) normalized -= 360;
  if (normalized < -180) normalized += 360;
  return normalized;
}

function angularDistance(a, b) {
  return Math.abs(normalizeAngle(a - b));
}

function closestEquivalentRotation(target, current) {
  let candidate = target;
  while (candidate - current > 180) candidate -= 360;
  while (candidate - current < -180) candidate += 360;
  return candidate;
}

function modulo(value, length) {
  return ((value % length) + length) % length;
}

function snapProjectDialValue(value, step = 1) {
  return Math.round(value / step) * step;
}
