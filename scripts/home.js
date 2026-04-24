function getHomeLizardAnchorPoint() {
  if (!homeNavButton) {
    return {
      x: lizardState.width * 0.22,
      y: Math.min(lizardState.height * 0.28, 220),
    };
  }

  const rect = homeNavButton.getBoundingClientRect();
  return {
    x: rect.left + rect.width * 0.72,
    y: rect.top - Math.max(56, rect.height * 1.6),
  };
}

function getHomeLizardParkedPoint() {
  const anchor = getHomeLizardAnchorPoint();
  return {
    x: anchor.x,
    y: anchor.y - Math.max(340, lizardState.height * 0.42),
  };
}

function getHomeLizardCenterPoint() {
  const desiredBodyCenterY = lizardState.height * 0.56;
  const headY = clampValue(
    desiredBodyCenterY -
      HOME_LIZARD_CONFIG.segmentLength * HOME_LIZARD_CONFIG.centerBodyIndex,
    88,
    Math.max(88, lizardState.height - 88),
  );

  return {
    x: lizardState.width * 0.5,
    y: headY,
  };
}

function shouldUseHomeLizardCenterFallback() {
  if (lizardState.hasPointerTarget) return false;
  return !window.matchMedia("(hover: hover) and (pointer: fine)").matches;
}

function updateHomeLizardAnchors() {
  const anchor = getHomeLizardAnchorPoint();
  const parked = getHomeLizardParkedPoint();
  lizardState.anchor.x = anchor.x;
  lizardState.anchor.y = anchor.y;
  lizardState.parked.x = parked.x;
  lizardState.parked.y = parked.y;
}

function updateHomeLizardState(previousSection = "") {
  updateHomeLizardAnchors();

  if (state.activeSection === "home") {
    if (previousSection !== "home") {
      setupLizard();
    }
    lizardState.renderVisible = true;
    homeLizardStage.classList.add("is-visible");
    if (previousSection !== "home" || lizardState.mode === "parked") {
      lizardState.mode = "entering";
    }
    lizardState.exitStartedAt = 0;
    startLizardLoop();
    return;
  }

  if (previousSection === "home" || lizardState.mode === "active" || lizardState.mode === "entering") {
    lizardState.renderVisible = true;
    lizardState.mode = "exiting";
    lizardState.exitOrigin.x = lizardState.critter?.x ?? lizardState.anchor.x;
    lizardState.exitOrigin.y = lizardState.critter?.y ?? lizardState.anchor.y;
    lizardState.exitStartedAt = performance.now();
    homeLizardStage.classList.add("is-visible");
    startLizardLoop();
    return;
  }

  if (lizardState.mode === "parked") {
    lizardState.renderVisible = false;
    homeLizardStage.classList.remove("is-visible");
    lizardState.exitStartedAt = 0;
  }
}

function invalidateNavFractureMetrics() {
  navButtons.forEach((button) => {
    navButtonLayoutCache.delete(button);
  });
}

function getButtonFractureMetrics(button) {
  const cached = navButtonLayoutCache.get(button);
  if (cached) return cached;

  const rect = button.getBoundingClientRect();
  const chars = getNavButtonChars(button).map((char) => {
    const charRect = char.getBoundingClientRect();
    return {
      node: char,
      index: Number.parseInt(char.style.getPropertyValue("--fracture-index"), 10) || 0,
      isSpace: char.classList.contains("is-space"),
      centerX: charRect.left + charRect.width * 0.5,
      centerY: charRect.top + charRect.height * 0.5,
    };
  });

  const metrics = { rect, chars };
  navButtonLayoutCache.set(button, metrics);
  return metrics;
}

function setButtonFracture(button, intensity, impactX, impactY, metrics = null) {
  if (intensity < 0.04) {
    button.classList.remove("is-fractured");
    getNavButtonChars(button).forEach(resetNavTextNode);
    return;
  }

  const activeMetrics = metrics || getButtonFractureMetrics(button);
  if (!activeMetrics.chars.length) return;

  button.classList.add("is-fractured");
  activeMetrics.chars.forEach(({ node, index, isSpace, centerX, centerY }) => {
    if (isSpace) {
      setNodeTextValue(node, "\u00a0");
      setNodeStyleValue(node, "--fracture-x", "0px");
      setNodeStyleValue(node, "--fracture-y", "0px");
      setNodeStyleValue(node, "--fracture-rotate", "0deg");
      setNodeStyleValue(node, "--fracture-opacity", "1");
      setNodeStyleValue(node, "--fracture-blur", "0px");
      return;
    }

    const dx = centerX - impactX;
    const dy = centerY - impactY;
    const distance = Math.hypot(dx, dy) || 1;
    const reach = 78 + intensity * 18;
    const falloff = Math.max(0, 1 - distance / reach);
    const signal = clampValue(intensity * falloff * 0.42, 0, 1);
    setNodeTextValue(node, resolveSignalScrambleChar(
      node.dataset.char || "",
      index,
      signal,
      lizardState.time * 16,
      Math.round(distance * 0.12),
    ));
    setNodeStyleValue(node, "--fracture-x", "0px");
    setNodeStyleValue(node, "--fracture-y", "0px");
    setNodeStyleValue(node, "--fracture-rotate", "0deg");
    setNodeStyleValue(node, "--fracture-opacity", `${(1 - signal * 0.08).toFixed(2)}`);
    setNodeStyleValue(node, "--fracture-blur", "0px");
  });
}

function getLizardImpactPoint(rect, padding = 10) {
  const expandedLeft = rect.left - padding;
  const expandedRight = rect.right + padding;
  const expandedTop = rect.top - padding;
  const expandedBottom = rect.bottom + padding;
  let best = null;

  for (let index = 0; index < lizardState.nodes.length; index += 1) {
    const node = lizardState.nodes[index];
    const dx =
      node.x < expandedLeft
        ? expandedLeft - node.x
        : node.x > expandedRight
          ? node.x - expandedRight
          : 0;
    const dy =
      node.y < expandedTop
        ? expandedTop - node.y
        : node.y > expandedBottom
          ? node.y - expandedBottom
          : 0;
    const distance = Math.hypot(dx, dy);

    if (!best || distance < best.distance) {
      best = { distance, x: node.x, y: node.y };
    }
  }

  return best;
}

function updateLizardTextFracture() {
  if (!state.lizardSignalEffectEnabled) {
    restoreNavEffectText();
    return;
  }

  navButtons.forEach((button) => {
    const fracture = navFractureState.get(button) || {
      intensity: 0,
      impactX: 0,
      impactY: 0,
      active: false,
    };

    if (!lizardState.renderVisible || !lizardState.critter) {
      if (fracture.intensity < 0.04 && !fracture.active) {
        return;
      }
      fracture.intensity += (0 - fracture.intensity) * 0.24;
      if (fracture.intensity < 0.04) {
        fracture.intensity = 0;
        if (fracture.active) {
          setButtonFracture(button, 0, fracture.impactX, fracture.impactY);
          fracture.active = false;
        }
        navFractureState.set(button, fracture);
        return;
      }
      setButtonFracture(button, fracture.intensity, fracture.impactX, fracture.impactY);
      fracture.active = true;
      navFractureState.set(button, fracture);
      return;
    }

    const metrics = getButtonFractureMetrics(button);
    const impact = getLizardImpactPoint(metrics.rect, 8);
    const targetIntensity = impact
      ? Math.max(0, Math.min(4.6, (84 - impact.distance) / 18))
      : 0;

    fracture.intensity +=
      (targetIntensity - fracture.intensity) *
      (targetIntensity > fracture.intensity ? 0.28 : 0.18);

    if (impact) {
      fracture.impactX += (impact.x - fracture.impactX) * 0.34;
      fracture.impactY += (impact.y - fracture.impactY) * 0.34;
    }

    if (fracture.intensity < 0.04) {
      fracture.intensity = 0;
      if (fracture.active) {
        setButtonFracture(button, 0, fracture.impactX, fracture.impactY);
        fracture.active = false;
      }
      navFractureState.set(button, fracture);
      return;
    }

    setButtonFracture(button, fracture.intensity, fracture.impactX, fracture.impactY, metrics);
    fracture.active = true;
    navFractureState.set(button, fracture);
  });
}

function getHomeLizardNodes() {
  if (lizardState.renderPoints.length) return lizardState.renderPoints;
  return lizardState.points;
}

function easeOutCubic(value) {
  return 1 - (1 - value) ** 4;
}

function angleDiff(a, b) {
  let diff = a - b;
  while (diff < -Math.PI) diff += Math.PI * 2;
  while (diff > Math.PI) diff -= Math.PI * 2;
  return diff;
}

function easeInOutSine(value) {
  return -(Math.cos(Math.PI * value) - 1) / 2;
}

function measureLizardBounds() {
  const nodes = getHomeLizardNodes();
  if (!nodes.length) {
    return {
      minX: 0,
      maxX: 0,
      minY: 0,
      maxY: 0,
    };
  }

  const bounds = {
    minX: Number.POSITIVE_INFINITY,
    maxX: Number.NEGATIVE_INFINITY,
    minY: Number.POSITIVE_INFINITY,
    maxY: Number.NEGATIVE_INFINITY,
  };

  for (let index = 0; index < nodes.length; index += 1) {
    const node = nodes[index];
    bounds.minX = Math.min(bounds.minX, node.x);
    bounds.maxX = Math.max(bounds.maxX, node.x);
    bounds.minY = Math.min(bounds.minY, node.y);
    bounds.maxY = Math.max(bounds.maxY, node.y);
  }

  return bounds;
}

function resolveHomeLizardLegTarget(leg, includeForwardOffset = true) {
  const spineNode = lizardState.renderPoints[leg.idx];
  if (!spineNode) {
    return { x: 0, y: 0 };
  }

  const scale = HOME_LIZARD_CONFIG.scale;
  const legReach = HOME_LIZARD_CONFIG.segmentLength * 4.2;
  const idealAngle =
    spineNode.angle +
    (Math.PI / 2.5) * leg.side +
    (leg.isFront ? 0.2 : -0.4);
  const forwardOffset = includeForwardOffset
    ? lizardState.speed * scale * (leg.isFront ? 3.5 : 4)
    : 0;

  return {
    x:
      spineNode.x +
      Math.cos(idealAngle) * legReach +
      Math.cos(spineNode.angle) * forwardOffset,
    y:
      spineNode.y +
      Math.sin(idealAngle) * legReach +
      Math.sin(spineNode.angle) * forwardOffset,
  };
}

function syncHomeLizardLegs() {
  lizardState.legs.forEach((leg) => {
    const target = resolveHomeLizardLegTarget(leg, false);
    leg.foot.x = target.x;
    leg.foot.y = target.y;
    leg.target.x = target.x;
    leg.target.y = target.y;
    leg.origin.x = target.x;
    leg.origin.y = target.y;
    leg.stepProgress = 1;
  });
}

function updateHomeLizardPhysics(targetX, targetY) {
  if (!lizardState.points.length) return;

  const head = lizardState.points[0];
  const dx = targetX - head.x;
  const dy = targetY - head.y;
  const distToTarget = Math.hypot(dx, dy);
  let targetSpeed = 0;

  if (distToTarget > 5) {
    targetSpeed = Math.min(distToTarget * 0.12, HOME_LIZARD_CONFIG.maxSpeed);
    targetSpeed += Math.sin(lizardState.walkCycle * 2) * 2.5;
    targetSpeed = Math.max(0.5, targetSpeed);
  }

  lizardState.speed += (targetSpeed - lizardState.speed) * 0.25;

  if (distToTarget > 2) {
    head.x += (dx / distToTarget) * lizardState.speed;
    head.y += (dy / distToTarget) * lizardState.speed;
    head.angle = Math.atan2(dy, dx);
  }

  lizardState.walkCycle += lizardState.speed * 0.05;
  for (let index = 1; index < HOME_LIZARD_CONFIG.segments; index += 1) {
    const point = lizardState.points[index];
    const previous = lizardState.points[index - 1];
    const deltaX = previous.x - point.x;
    const deltaY = previous.y - point.y;
    let targetAngle = Math.atan2(deltaY, deltaX);
    const diff = angleDiff(targetAngle, previous.angle);

    if (Math.abs(diff) > HOME_LIZARD_CONFIG.maxBend) {
      targetAngle = previous.angle + Math.sign(diff) * HOME_LIZARD_CONFIG.maxBend;
    }

    point.angle = targetAngle;
    point.x = previous.x - Math.cos(point.angle) * HOME_LIZARD_CONFIG.segmentLength;
    point.y = previous.y - Math.sin(point.angle) * HOME_LIZARD_CONFIG.segmentLength;
  }

  for (let index = 0; index < HOME_LIZARD_CONFIG.segments; index += 1) {
    const point = lizardState.points[index];
    const renderPoint = lizardState.renderPoints[index];
    let swayFactor = 0;

    if (index <= 25) {
      swayFactor = Math.sin((index / 25) * Math.PI);
    } else {
      const tailProgress = (index - 25) / (HOME_LIZARD_CONFIG.segments - 25);
      swayFactor = tailProgress * tailProgress * 1.8;
    }

    const swayAmplitude = lizardState.speed * 0.4 * swayFactor;
    const swayPhase = lizardState.walkCycle - index * 0.2;
    const swayOffset = Math.sin(swayPhase) * swayAmplitude;

    renderPoint.x = point.x + Math.cos(point.angle + Math.PI / 2) * swayOffset;
    renderPoint.y = point.y + Math.sin(point.angle + Math.PI / 2) * swayOffset;
    renderPoint.angle = point.angle;
  }

  lizardState.legs.forEach((leg) => {
    const nextTarget = resolveHomeLizardLegTarget(leg);
    const distToIdeal = Math.hypot(
      nextTarget.x - leg.foot.x,
      nextTarget.y - leg.foot.y,
    );
    const cycleMod = lizardState.walkCycle % (Math.PI * 2);
    const isMyTurn = leg.pair === 0 ? cycleMod < Math.PI : cycleMod >= Math.PI;

    if (
      leg.stepProgress >= 1 &&
      ((distToIdeal > HOME_LIZARD_CONFIG.segmentLength * 2 &&
        isMyTurn &&
        lizardState.speed > 1) ||
        distToIdeal > HOME_LIZARD_CONFIG.segmentLength * 4)
    ) {
      leg.origin.x = leg.foot.x;
      leg.origin.y = leg.foot.y;
      leg.target.x = nextTarget.x;
      leg.target.y = nextTarget.y;
      leg.stepProgress = 0;
    }

    if (leg.stepProgress < 1) {
      leg.stepProgress += 0.18;
      if (leg.stepProgress > 1) leg.stepProgress = 1;

      const ease = easeOutCubic(leg.stepProgress);
      leg.foot.x = leg.origin.x + (leg.target.x - leg.origin.x) * ease;
      leg.foot.y = leg.origin.y + (leg.target.y - leg.origin.y) * ease;
    }
  });

  lizardState.critter = head;
  lizardState.nodes = getHomeLizardNodes();
}

function drawHomeLizardLegs() {
  const scale = HOME_LIZARD_CONFIG.scale;
  homeLizardContext.lineWidth = HOME_LIZARD_CONFIG.lineWidth;

  lizardState.legs.forEach((leg) => {
    const spineNode = lizardState.renderPoints[leg.idx];
    if (!spineNode) return;

    const shoulderWidth = HOME_LIZARD_CONFIG.segmentLength * 1.5;
    const shoulderAngle = spineNode.angle + (Math.PI / 2) * leg.side;
    const shoulderX = spineNode.x + Math.cos(shoulderAngle) * shoulderWidth;
    const shoulderY = spineNode.y + Math.sin(shoulderAngle) * shoulderWidth;
    const footX = leg.foot.x;
    const footY = leg.foot.y;
    const dx = footX - shoulderX;
    const dy = footY - shoulderY;
    let dist = Math.max(0.001, Math.hypot(dx, dy));
    const upperLength =
      HOME_LIZARD_CONFIG.segmentLength * (leg.isFront ? 2.5 : 3);
    const lowerLength =
      HOME_LIZARD_CONFIG.segmentLength * (leg.isFront ? 2.5 : 3);

    if (dist >= upperLength + lowerLength) {
      dist = upperLength + lowerLength - 0.01;
    }

    const angleToFoot = Math.atan2(dy, dx);
    const cosAlpha =
      (upperLength * upperLength +
        dist * dist -
        lowerLength * lowerLength) /
      (2 * upperLength * dist);
    const alpha = Math.acos(Math.max(-1, Math.min(1, cosAlpha)));
    const jointAngle = angleToFoot + leg.side * alpha;
    const jointX = shoulderX + Math.cos(jointAngle) * upperLength;
    const jointY = shoulderY + Math.sin(jointAngle) * upperLength;

    homeLizardContext.beginPath();
    homeLizardContext.moveTo(spineNode.x, spineNode.y);
    homeLizardContext.lineTo(shoulderX, shoulderY);
    homeLizardContext.lineTo(jointX, jointY);
    homeLizardContext.lineTo(footX, footY);
    homeLizardContext.stroke();

    const toeLength = 6 * scale;
    const footDirection = spineNode.angle + (Math.PI / 8) * leg.side;
    homeLizardContext.beginPath();
    for (let toeIndex = -1; toeIndex <= 1; toeIndex += 1) {
      const toeAngle = footDirection + toeIndex * 0.4;
      homeLizardContext.moveTo(footX, footY);
      homeLizardContext.lineTo(
        footX + Math.cos(toeAngle) * toeLength,
        footY + Math.sin(toeAngle) * toeLength,
      );
    }
    homeLizardContext.stroke();
  });
}

function drawHomeLizardSpineAndRibs() {
  const scale = HOME_LIZARD_CONFIG.scale;
  homeLizardContext.lineWidth = HOME_LIZARD_CONFIG.lineWidth;
  homeLizardContext.beginPath();
  homeLizardContext.moveTo(
    lizardState.renderPoints[0].x,
    lizardState.renderPoints[0].y,
  );

  for (let index = 1; index < HOME_LIZARD_CONFIG.segments - 1; index += 1) {
    const point = lizardState.renderPoints[index];
    const nextPoint = lizardState.renderPoints[index + 1];
    const midX = (point.x + nextPoint.x) / 2;
    const midY = (point.y + nextPoint.y) / 2;
    homeLizardContext.quadraticCurveTo(point.x, point.y, midX, midY);
  }

  const tailEnd = lizardState.renderPoints[HOME_LIZARD_CONFIG.segments - 1];
  homeLizardContext.lineTo(tailEnd.x, tailEnd.y);
  homeLizardContext.stroke();

  for (let index = 3; index < 28; index += 1) {
    const point = lizardState.renderPoints[index];

    if (index >= 6 && index <= 23) {
      const ribRatio = Math.sin(((index - 5) / 19) * Math.PI);
      const ribWidth = ribRatio * 18 * scale;
      const sweep = 0.35;

      homeLizardContext.beginPath();
      homeLizardContext.moveTo(point.x, point.y);
      homeLizardContext.quadraticCurveTo(
        point.x + Math.cos(point.angle - Math.PI / 2 - sweep) * ribWidth * 0.8,
        point.y + Math.sin(point.angle - Math.PI / 2 - sweep) * ribWidth * 0.8,
        point.x + Math.cos(point.angle - Math.PI / 2) * ribWidth,
        point.y + Math.sin(point.angle - Math.PI / 2) * ribWidth,
      );
      homeLizardContext.stroke();

      homeLizardContext.beginPath();
      homeLizardContext.moveTo(point.x, point.y);
      homeLizardContext.quadraticCurveTo(
        point.x + Math.cos(point.angle + Math.PI / 2 + sweep) * ribWidth * 0.8,
        point.y + Math.sin(point.angle + Math.PI / 2 + sweep) * ribWidth * 0.8,
        point.x + Math.cos(point.angle + Math.PI / 2) * ribWidth,
        point.y + Math.sin(point.angle + Math.PI / 2) * ribWidth,
      );
      homeLizardContext.stroke();
    } else {
      const vertebraWidth = (index < 6 ? 3 : 4) * scale;
      homeLizardContext.beginPath();
      homeLizardContext.moveTo(
        point.x + Math.cos(point.angle - Math.PI / 2) * vertebraWidth,
        point.y + Math.sin(point.angle - Math.PI / 2) * vertebraWidth,
      );
      homeLizardContext.lineTo(
        point.x + Math.cos(point.angle + Math.PI / 2) * vertebraWidth,
        point.y + Math.sin(point.angle + Math.PI / 2) * vertebraWidth,
      );
      homeLizardContext.stroke();
    }
  }
}

function drawHomeLizardTail() {
  const scale = HOME_LIZARD_CONFIG.scale;
  homeLizardContext.lineWidth = HOME_LIZARD_CONFIG.lineWidth;

  for (let index = 28; index < HOME_LIZARD_CONFIG.segments; index += 2) {
    const point = lizardState.renderPoints[index];
    const taperRatio =
      1 - (index - 28) / (HOME_LIZARD_CONFIG.segments - 28);
    const tailWidth = taperRatio * 5.5 * scale;

    homeLizardContext.beginPath();
    homeLizardContext.moveTo(
      point.x + Math.cos(point.angle - Math.PI / 2) * tailWidth,
      point.y + Math.sin(point.angle - Math.PI / 2) * tailWidth,
    );
    homeLizardContext.lineTo(
      point.x + Math.cos(point.angle + Math.PI / 2) * tailWidth,
      point.y + Math.sin(point.angle + Math.PI / 2) * tailWidth,
    );
    homeLizardContext.stroke();
  }
}

function drawHomeLizardHead() {
  const scale = HOME_LIZARD_CONFIG.scale;
  const head = lizardState.renderPoints[0];
  const neck = lizardState.renderPoints[2];
  const angle = head.angle;
  const snout = {
    x: head.x + Math.cos(angle) * 9 * scale,
    y: head.y + Math.sin(angle) * 9 * scale,
  };
  const skullBack = {
    x: neck.x - Math.cos(angle) * 2 * scale,
    y: neck.y - Math.sin(angle) * 2 * scale,
  };
  const leftJaw = {
    x: neck.x + Math.cos(angle - Math.PI / 2) * 7 * scale,
    y: neck.y + Math.sin(angle - Math.PI / 2) * 7 * scale,
  };
  const rightJaw = {
    x: neck.x + Math.cos(angle + Math.PI / 2) * 7 * scale,
    y: neck.y + Math.sin(angle + Math.PI / 2) * 7 * scale,
  };
  const leftEye = {
    x: head.x + Math.cos(angle - Math.PI / 2) * 9 * scale,
    y: head.y + Math.sin(angle - Math.PI / 2) * 9 * scale,
  };
  const rightEye = {
    x: head.x + Math.cos(angle + Math.PI / 2) * 9 * scale,
    y: head.y + Math.sin(angle + Math.PI / 2) * 9 * scale,
  };

  homeLizardContext.beginPath();
  homeLizardContext.moveTo(snout.x, snout.y);
  homeLizardContext.lineTo(leftEye.x, leftEye.y);
  homeLizardContext.lineTo(leftJaw.x, leftJaw.y);
  homeLizardContext.lineTo(skullBack.x, skullBack.y);
  homeLizardContext.lineTo(rightJaw.x, rightJaw.y);
  homeLizardContext.lineTo(rightEye.x, rightEye.y);
  homeLizardContext.closePath();
  homeLizardContext.stroke();

  const eyeOffsetX = Math.cos(angle - Math.PI / 2) * 4.5 * scale;
  const eyeOffsetY = Math.sin(angle - Math.PI / 2) * 4.5 * scale;

  homeLizardContext.beginPath();
  homeLizardContext.arc(
    head.x + eyeOffsetX,
    head.y + eyeOffsetY,
    2.5 * scale,
    0,
    Math.PI * 2,
  );
  homeLizardContext.stroke();

  homeLizardContext.beginPath();
  homeLizardContext.arc(
    head.x - eyeOffsetX,
    head.y - eyeOffsetY,
    2.5 * scale,
    0,
    Math.PI * 2,
  );
  homeLizardContext.stroke();

  homeLizardContext.beginPath();
  homeLizardContext.moveTo(snout.x, snout.y);
  homeLizardContext.lineTo(skullBack.x, skullBack.y);
  homeLizardContext.stroke();
}

function drawHomeLizardSkeleton() {
  if (lizardState.renderPoints.length < 3) return;
  drawHomeLizardLegs();
  drawHomeLizardSpineAndRibs();
  drawHomeLizardTail();
  drawHomeLizardHead();
}

function initializeLizardCanvas() {
  resizeLizardCanvas();
  startLizardLoop();
}

function startLizardLoop() {
  if (lizardState.running) return;
  lizardState.running = true;
  lizardState.lastFrameAt = 0;
  lizardState.rafId = window.requestAnimationFrame(runLizardLoop);
}

function stopLizardLoop() {
  if (!lizardState.running) return;
  window.cancelAnimationFrame(lizardState.rafId);
  lizardState.rafId = 0;
  lizardState.lastFrameAt = 0;
  lizardState.running = false;
}

function shouldKeepLizardLoopRunning() {
  return !document.hidden;
}

function handleVisibilityChange() {
  if (document.hidden) {
    stopLizardLoop();
    return;
  }

  if (shouldKeepLizardLoopRunning()) {
    startLizardLoop();
  }
}

function resizeLizardCanvas() {
  const dpr = Math.min(window.devicePixelRatio || 1, lizardState.maxDpr);
  lizardState.width = window.innerWidth;
  lizardState.height = window.innerHeight;
  lizardState.dpr = dpr;
  homeLizardCanvas.width = Math.round(lizardState.width * dpr);
  homeLizardCanvas.height = Math.round(lizardState.height * dpr);
  homeLizardCanvas.style.width = `${lizardState.width}px`;
  homeLizardCanvas.style.height = `${lizardState.height}px`;
  homeLizardContext.setTransform(dpr, 0, 0, dpr, 0, 0);
  updateHomeLizardAnchors();
  if (!lizardState.input.mouse.x && !lizardState.input.mouse.y) {
    lizardState.input.mouse.x = lizardState.anchor.x;
    lizardState.input.mouse.y = lizardState.anchor.y;
  }
  lizardState.followTarget.x = lizardState.input.mouse.x || lizardState.anchor.x;
  lizardState.followTarget.y = lizardState.input.mouse.y || lizardState.anchor.y;

  setupLizard();
  startLizardLoop();
}

function handleLizardPointerMove(event) {
  lizardState.input.mouse.x = event.clientX;
  lizardState.input.mouse.y = event.clientY;
  lizardState.hasPointerTarget = true;
}

function handleLizardPointerDown(event) {
  lizardState.input.mouse.x = event.clientX;
  lizardState.input.mouse.y = event.clientY;
  lizardState.hasPointerTarget = true;
  if (event.button === 0) lizardState.input.mouse.left = true;
  if (event.button === 1) lizardState.input.mouse.middle = true;
  if (event.button === 2) lizardState.input.mouse.right = true;
}

function handleLizardPointerUp(event) {
  if (event.button === 0) lizardState.input.mouse.left = false;
  if (event.button === 1) lizardState.input.mouse.middle = false;
  if (event.button === 2) lizardState.input.mouse.right = false;
}

function handleLizardTouch(event) {
  const touch = event.touches[0];
  if (!touch) return;
  lizardState.input.mouse.x = touch.clientX;
  lizardState.input.mouse.y = touch.clientY;
  lizardState.hasPointerTarget = true;
}

function runLizardLoop(timestamp) {
  if (
    lizardState.lastFrameAt &&
    timestamp - lizardState.lastFrameAt < lizardState.frameInterval
  ) {
    lizardState.rafId = window.requestAnimationFrame(runLizardLoop);
    return;
  }

  lizardState.lastFrameAt = timestamp;
  try {
    drawHomeLizard();
  } catch (error) {
    console.error("Home lizard loop failed:", error);
    state.lizardSignalEffectEnabled = false;
    restoreNavEffectText();
  }

  if (!shouldKeepLizardLoopRunning()) {
    stopLizardLoop();
    return;
  }

  lizardState.rafId = window.requestAnimationFrame(runLizardLoop);
}

function drawHomeLizard() {
  if (!homeLizardContext) return;

  homeLizardContext.clearRect(0, 0, lizardState.width, lizardState.height);
  if (!lizardState.renderVisible || !lizardState.critter) {
    updateLizardTextFracture();
    return;
  }

  lizardState.time += 1;
  let targetX = lizardState.input.mouse.x;
  let targetY = lizardState.input.mouse.y;
  let exitProgress = 0;

  if (lizardState.mode === "entering") {
    targetX = lizardState.anchor.x;
    targetY = lizardState.anchor.y;
  } else if (lizardState.mode === "exiting") {
    exitProgress = lizardState.exitStartedAt
      ? Math.min(1, (performance.now() - lizardState.exitStartedAt) / lizardState.exitTravelMs)
      : 1;
    const eased = 1 - (1 - exitProgress) ** 3;
    const arcLift = Math.sin(eased * Math.PI) * Math.max(20, lizardState.height * 0.02);
    targetX = lerpValue(lizardState.exitOrigin.x, lizardState.parked.x, eased);
    targetY = lerpValue(lizardState.exitOrigin.y, lizardState.parked.y, eased) - arcLift;
  } else if (lizardState.mode === "parked") {
    targetX = lizardState.parked.x;
    targetY = lizardState.parked.y;
  }

  if (lizardState.mode === "active" && shouldUseHomeLizardCenterFallback()) {
    const centerPoint = getHomeLizardCenterPoint();
    targetX = centerPoint.x;
    targetY = centerPoint.y;
  }

  if (lizardState.mode === "active") {
    const followDx = targetX - lizardState.followTarget.x;
    const followDy = targetY - lizardState.followTarget.y;
    const followDistance = Math.hypot(followDx, followDy);
    const followEase = clampValue(0.014 + followDistance / 2400, 0.014, 0.045);
    lizardState.followTarget.x += followDx * followEase;
    lizardState.followTarget.y += followDy * followEase;
    targetX = lizardState.followTarget.x;
    targetY = lizardState.followTarget.y;
  } else {
    lizardState.followTarget.x = targetX;
    lizardState.followTarget.y = targetY;
  }

  const simulationSteps =
    lizardState.mode === "entering"
      ? 3
      : lizardState.mode === "exiting" && exitProgress > 0.58
        ? 2
        : 1;

  for (let stepIndex = 0; stepIndex < simulationSteps; stepIndex += 1) {
    updateHomeLizardPhysics(targetX, targetY);
  }

  homeLizardContext.save();
  homeLizardContext.lineCap = "round";
  homeLizardContext.lineJoin = "round";
  homeLizardContext.strokeStyle = HOME_LIZARD_CONFIG.lineColor;
  drawHomeLizardSkeleton();
  homeLizardContext.restore();

  const distanceToGoal = Math.hypot(
    (lizardState.critter?.x ?? targetX) - targetX,
    (lizardState.critter?.y ?? targetY) - targetY,
  );
  const bounds = measureLizardBounds();

  if (lizardState.mode === "entering" && distanceToGoal < 42) {
    lizardState.mode = "active";
  }

  if (
    lizardState.mode === "exiting" &&
    (bounds.maxY < -56 || (exitProgress >= 1 && distanceToGoal < 28))
  ) {
    lizardState.mode = "parked";
    lizardState.renderVisible = false;
    lizardState.exitStartedAt = 0;
    homeLizardStage.classList.remove("is-visible");
  }

  updateLizardTextFracture();
}

function setupLizard() {
  const startPoint =
    lizardState.points[0] ||
    (lizardState.mode === "active" ? lizardState.anchor : lizardState.parked);
  const startAngle = -Math.PI / 2;

  lizardState.points = Array.from(
    { length: HOME_LIZARD_CONFIG.segments },
    (_, index) => ({
      x: startPoint.x,
      y: startPoint.y + index * HOME_LIZARD_CONFIG.segmentLength,
      angle: startAngle,
    }),
  );
  lizardState.renderPoints = Array.from(
    { length: HOME_LIZARD_CONFIG.segments },
    (_, index) => ({
      x: startPoint.x,
      y: startPoint.y + index * HOME_LIZARD_CONFIG.segmentLength,
      angle: startAngle,
    }),
  );
  lizardState.legs = [
    {
      idx: HOME_LIZARD_CONFIG.frontLegIndex,
      side: -1,
      isFront: true,
      pair: 0,
    },
    {
      idx: HOME_LIZARD_CONFIG.frontLegIndex,
      side: 1,
      isFront: true,
      pair: 1,
    },
    {
      idx: HOME_LIZARD_CONFIG.backLegIndex,
      side: -1,
      isFront: false,
      pair: 1,
    },
    {
      idx: HOME_LIZARD_CONFIG.backLegIndex,
      side: 1,
      isFront: false,
      pair: 0,
    },
  ].map((leg) => ({
    ...leg,
    foot: { x: startPoint.x, y: startPoint.y },
    target: { x: startPoint.x, y: startPoint.y },
    origin: { x: startPoint.x, y: startPoint.y },
    stepProgress: 1,
  }));

  lizardState.speed = 0;
  lizardState.walkCycle = 0;
  lizardState.critter = lizardState.points[0];
  lizardState.followTarget.x = startPoint.x;
  lizardState.followTarget.y = startPoint.y;
  lizardState.nodes = getHomeLizardNodes();
  syncHomeLizardLegs();
}

