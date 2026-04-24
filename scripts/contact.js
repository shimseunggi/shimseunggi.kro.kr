function loadContactRunnerBestScore() {
  try {
    const raw = window.localStorage.getItem(CONTACT_RUNNER_BEST_SCORE_KEY);
    const parsed = Number.parseInt(raw || "", 10);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : 0;
  } catch (error) {
    return 0;
  }
}

function saveContactRunnerBestScore(value) {
  try {
    window.localStorage.setItem(CONTACT_RUNNER_BEST_SCORE_KEY, String(Math.max(0, value)));
  } catch (error) {
    // Ignore storage failures and keep the in-memory score.
  }
}

function resizeContactRunnerHudCanvas(canvas, ctx) {
  if (!canvas || !ctx) return { width: 0, height: 0 };
  const rect = canvas.getBoundingClientRect();
  const width = Math.max(1, Math.round(rect.width || canvas.clientWidth || 1));
  const height = Math.max(1, Math.round(rect.height || canvas.clientHeight || 1));
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  canvas.width = Math.round(width * dpr);
  canvas.height = Math.round(height * dpr);
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.imageSmoothingEnabled = false;
  return { width, height };
}

function formatContactRunnerScore(value) {
  return String(Math.max(0, Math.floor(value))).padStart(5, "0").slice(-5);
}

function drawContactRunnerGlyph(ctx, glyph, x, y, scale = 1) {
  const sprite = CONTACT_RUNNER_SPRITES.scoreText;
  const glyphOrder = "0123456789HI";
  const glyphIndex = glyphOrder.indexOf(glyph);
  if (glyphIndex < 0 || !contactRunnerAssets.loaded || !contactRunnerAssets.image) {
    return false;
  }

  ctx.drawImage(
    contactRunnerAssets.image,
    sprite.x + glyphIndex * sprite.glyphWidth,
    sprite.y,
    sprite.glyphWidth,
    sprite.glyphHeight,
    x,
    y,
    sprite.drawWidth * scale,
    sprite.drawHeight * scale,
  );
  return true;
}

function drawContactRunnerBitmapText(ctx, text, x, y, scale = 1) {
  const sprite = CONTACT_RUNNER_SPRITES.scoreText;
  const glyphAdvance = sprite.drawWidth * scale + Math.max(1, Math.round(scale));
  const spaceAdvance = Math.max(5, Math.round(6 * scale));
  let cursorX = x;

  for (const glyph of text) {
    if (glyph === " ") {
      cursorX += spaceAdvance;
      continue;
    }

    const drew = drawContactRunnerGlyph(ctx, glyph, cursorX, y, scale);
    if (!drew) {
      ctx.fillStyle = "rgba(17,17,17,0.94)";
      ctx.font = `${Math.max(10, Math.round(12 * scale))}px monospace`;
      ctx.textBaseline = "top";
      ctx.fillText(glyph, cursorX, y);
    }
    cursorX += glyphAdvance;
  }

  return cursorX - x;
}

function getContactRunnerBitmapTextWidth(text, scale = 1) {
  const sprite = CONTACT_RUNNER_SPRITES.scoreText;
  const glyphAdvance = sprite.drawWidth * scale + Math.max(1, Math.round(scale));
  const spaceAdvance = Math.max(5, Math.round(6 * scale));
  let width = 0;

  for (const glyph of text) {
    width += glyph === " " ? spaceAdvance : glyphAdvance;
  }

  return Math.max(0, width - Math.max(1, Math.round(scale)));
}

function syncContactRunnerBestScore() {
  if (contactRunnerState.score <= contactRunnerState.bestScore) return;
  contactRunnerState.bestScore = contactRunnerState.score;
  saveContactRunnerBestScore(contactRunnerState.bestScore);
}

function getContactRunnerAudioContext() {
  const AudioContextClass = window.AudioContext || window.webkitAudioContext;
  if (!AudioContextClass) return null;
  if (!contactRunnerAudio.context) {
    contactRunnerAudio.context = new AudioContextClass();
  }
  if (contactRunnerAudio.context.state === "suspended") {
    contactRunnerAudio.context.resume().catch(() => {});
  }
  return contactRunnerAudio.context;
}

function playContactRunnerMilestoneChime() {
  const ctx = getContactRunnerAudioContext();
  if (!ctx) return;

  const startAt = ctx.currentTime + 0.01;
  [880, 1174].forEach((frequency, index) => {
    const oscillator = ctx.createOscillator();
    const gain = ctx.createGain();
    oscillator.type = "square";
    oscillator.frequency.value = frequency;
    gain.gain.setValueAtTime(0.0001, startAt);
    gain.gain.linearRampToValueAtTime(0.05, startAt + 0.01 + index * 0.08);
    gain.gain.exponentialRampToValueAtTime(0.0001, startAt + 0.08 + index * 0.08);
    oscillator.connect(gain);
    gain.connect(ctx.destination);
    oscillator.start(startAt + index * 0.08);
    oscillator.stop(startAt + 0.1 + index * 0.08);
  });
}

function createContactRunnerMoon() {
  const scale = contactDinoState.dino ? contactDinoState.dino.scale : 1;
  const sprite = CONTACT_RUNNER_SPRITES.moonPhases[
    contactRunnerState.moonPhaseIndex % CONTACT_RUNNER_SPRITES.moonPhases.length
  ];
  return {
    x: contactDinoState.width + 56 * scale,
    y: Math.max(18 * scale, contactDinoState.height * 0.08),
    speed: 12 * scale,
    sprite,
  };
}

function ensureContactRunnerMoon() {
  if (contactRunnerState.moon) return;
  contactRunnerState.moon = createContactRunnerMoon();
}

function updateContactRunnerMoon(dt) {
  if (!contactRunnerState.moon) return;
  contactRunnerState.moon.x -= contactRunnerState.moon.speed * dt;
  if (contactRunnerState.moon.x + contactRunnerState.moon.sprite.drawWidth < -24) {
    contactRunnerState.moonPhaseIndex =
      (contactRunnerState.moonPhaseIndex + 1) % CONTACT_RUNNER_SPRITES.moonPhases.length;
    contactRunnerState.moon = createContactRunnerMoon();
  }
}

function triggerContactRunnerMilestoneFlash(scoreValue) {
  if (!scoreValue || scoreValue % 100 !== 0) return;
  if (scoreValue <= contactRunnerState.lastMilestoneScore) return;
  contactRunnerState.lastMilestoneScore = scoreValue;
  contactRunnerState.milestoneFlashValue = scoreValue;
  contactRunnerState.milestoneFlashTimer = contactRunnerState.milestoneFlashDuration;
  playContactRunnerMilestoneChime();
}

function shouldShowContactRunnerCurrentScore() {
  if (contactRunnerState.milestoneFlashTimer <= 0) return true;
  const elapsed =
    contactRunnerState.milestoneFlashDuration - contactRunnerState.milestoneFlashTimer;
  return Math.floor(elapsed / contactRunnerState.milestoneFlashStep) % 2 === 0;
}

function updateContactRunnerScore() {
  const scale = contactDinoState.dino ? contactDinoState.dino.scale : 1;
  const nextScore = Math.max(
    contactRunnerState.score,
    Math.floor(contactRunnerState.distance / (36 * scale)),
  );
  if (nextScore === contactRunnerState.score) return;
  contactRunnerState.score = nextScore;
  syncContactRunnerBestScore();
  triggerContactRunnerMilestoneFlash(nextScore);
}

function renderContactRunnerScoreboard() {
  const { width, height } = resizeContactRunnerHudCanvas(
    contactRunnerScoreCanvas,
    contactRunnerScoreContext,
  );
  if (!width || !height) return;

  const ctx = contactRunnerScoreContext;
  const sprite = CONTACT_RUNNER_SPRITES.scoreText;
  const scale = width <= 132 ? 0.86 : 1;
  const currentScoreValue =
    contactRunnerState.milestoneFlashTimer > 0
      ? contactRunnerState.milestoneFlashValue
      : contactRunnerState.score;
  const currentScore = formatContactRunnerScore(currentScoreValue);
  const bestScore = formatContactRunnerScore(contactRunnerState.bestScore);
  const currentWidth = getContactRunnerBitmapTextWidth(currentScore, scale);
  const bestLabel = `HI ${bestScore}`;
  const bestWidth = getContactRunnerBitmapTextWidth(bestLabel, scale);
  const gap = Math.max(10, Math.round(12 * scale));
  const y = Math.max(0, Math.round((height - sprite.drawHeight * scale) * 0.5));

  ctx.clearRect(0, 0, width, height);

  const currentX = Math.max(0, width - currentWidth);
  if (shouldShowContactRunnerCurrentScore()) {
    drawContactRunnerBitmapText(ctx, currentScore, currentX, y, scale);
  }

  const bestX = Math.max(0, currentX - gap - bestWidth);
  drawContactRunnerBitmapText(ctx, bestLabel, bestX, y, scale);
}

function renderContactRunnerOverlay() {
  const gameOverSize = resizeContactRunnerHudCanvas(
    contactRunnerGameOverCanvas,
    contactRunnerGameOverContext,
  );
  const restartSize = resizeContactRunnerHudCanvas(
    contactRunnerRestartCanvas,
    contactRunnerRestartContext,
  );

  if (gameOverSize.width && gameOverSize.height) {
    const ctx = contactRunnerGameOverContext;
    ctx.clearRect(0, 0, gameOverSize.width, gameOverSize.height);
    const drewGameOver = drawContactRunnerSprite(
      ctx,
      CONTACT_RUNNER_SPRITES.gameOver,
      0,
      0,
      gameOverSize.width / CONTACT_RUNNER_SPRITES.gameOver.drawWidth,
    );

    if (!drewGameOver) {
      ctx.fillStyle = "rgba(17,17,17,0.94)";
      ctx.font = "bold 11px monospace";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText("GAME OVER", gameOverSize.width * 0.5, gameOverSize.height * 0.5);
    }
  }

  if (restartSize.width && restartSize.height) {
    const ctx = contactRunnerRestartContext;
    ctx.clearRect(0, 0, restartSize.width, restartSize.height);
    const drewRestart = drawContactRunnerSprite(
      ctx,
      CONTACT_RUNNER_SPRITES.restart,
      0,
      0,
      restartSize.width / CONTACT_RUNNER_SPRITES.restart.drawWidth,
    );

    if (!drewRestart) {
      ctx.strokeStyle = "rgba(17,17,17,0.94)";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(restartSize.width * 0.5, restartSize.height * 0.5, 10, 0.45, Math.PI * 1.7);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(restartSize.width * 0.62, restartSize.height * 0.16);
      ctx.lineTo(restartSize.width * 0.78, restartSize.height * 0.2);
      ctx.lineTo(restartSize.width * 0.68, restartSize.height * 0.34);
      ctx.stroke();
    }
  }
}

function updateContactRunnerHud() {
  const showHud =
    state.activeSection === "contact" &&
    contactDinoState.renderVisible &&
    (contactRunnerState.status === "playing" || contactRunnerState.status === "gameover");
  const showOverlay = showHud && contactRunnerState.status === "gameover";

  contactRunnerScoreboard.classList.toggle("is-visible", showHud);
  contactRunnerScoreboard.setAttribute("aria-hidden", showHud ? "false" : "true");
  contactRunnerOverlay.classList.toggle("is-visible", showOverlay);
  contactRunnerOverlay.setAttribute("aria-hidden", showOverlay ? "false" : "true");

  if (!showHud) return;
  renderContactRunnerScoreboard();
  renderContactRunnerOverlay();
}

function initializeContactRunnerAssets() {
  const image = new Image();
  image.decoding = "async";
  image.onload = () => {
    contactRunnerAssets.image = image;
    contactRunnerAssets.loaded = true;
    updateContactRunnerHud();
  };
  image.onerror = () => {
    contactRunnerAssets.image = null;
    contactRunnerAssets.loaded = false;
    updateContactRunnerHud();
  };
  image.src = CONTACT_RUNNER_SPRITE_URL;
}

function drawContactRunnerSprite(ctx, sprite, x, y, scale, frameIndex = 0) {
  if (!contactRunnerAssets.loaded || !contactRunnerAssets.image || !sprite) {
    return false;
  }

  const frameOffset = sprite.frameOffset ? sprite.frameOffset * frameIndex : 0;
  ctx.drawImage(
    contactRunnerAssets.image,
    sprite.x + frameOffset,
    sprite.y,
    sprite.width,
    sprite.height,
    x,
    y,
    sprite.drawWidth * scale,
    sprite.drawHeight * scale,
  );
  return true;
}

function getRunnerGroundY() {
  const scale = contactDinoState.dino ? contactDinoState.dino.scale : getContactDinoScale();
  const bottomPadding = clampValue(6 * scale, 6, 14);
  return contactDinoState.height - bottomPadding;
}

function spawnContactRunnerCloud(forceX = null) {
  const scale = contactDinoState.dino ? contactDinoState.dino.scale : 1;
  const cloudSprite = CONTACT_RUNNER_SPRITES.cloud;
  const width = cloudSprite.drawWidth * scale;
  const height = cloudSprite.drawHeight * scale;
  const cloudTop = Math.max(14 * scale, contactDinoState.height * 0.1);
  const cloudBottom = Math.max(cloudTop + 10 * scale, contactDinoState.height * 0.34);

  contactRunnerState.clouds.push({
    x: forceX ?? contactDinoState.width + width,
    y: lerpValue(cloudTop, cloudBottom, Math.random()),
    width,
    height,
    speed: (16 + Math.random() * 10) * scale,
  });
}

function ensureContactRunnerClouds() {
  if (contactRunnerState.clouds.length) return;

  const width = contactDinoState.width || window.innerWidth;
  spawnContactRunnerCloud(width * 0.18);
  spawnContactRunnerCloud(width * 0.54);
}

function stopContactRunner(resetState = false) {
  contactRunnerState.status = "inactive";
  if (resetState) {
    contactRunnerState.speed = 0;
    contactRunnerState.startSpeed = 0;
    contactRunnerState.targetX = 0;
    contactRunnerState.transitionOriginX = 0;
    contactRunnerState.transitionProgress = 0;
    contactRunnerState.distance = 0;
    contactRunnerState.score = 0;
    contactRunnerState.milestoneFlashTimer = 0;
    contactRunnerState.milestoneFlashValue = 0;
    contactRunnerState.lastMilestoneScore = 0;
    contactRunnerState.moonPhaseIndex = 0;
    contactRunnerState.moon = null;
    contactRunnerState.dinoVy = 0;
    contactRunnerState.obstacles = [];
    contactRunnerState.clouds = [];
    contactRunnerState.spawnTimer = 0;
    contactRunnerState.cloudSpawnTimer = 0;
    contactRunnerState.floorOffset = 0;
    contactRunnerState.isDucking = false;
  }

  if (contactDinoState.dino) {
    contactDinoState.dino.groundAt = buildContactDinoGroundAt(contactDinoState.height);
  }

  if (state.activeSection === "contact" && contactDinoState.mode === "active") {
    helpText.classList.add("is-visible");
  }
}

function startContactRunner() {
  getContactRunnerAudioContext();
  contactRunnerState.status = "starting";

  const scale = contactDinoState.dino ? contactDinoState.dino.scale : 1;
  contactRunnerState.speed = 0;
  contactRunnerState.startSpeed = 260 * scale;
  contactRunnerState.targetX = contactDinoState.width * 0.15;
  contactRunnerState.transitionOriginX = contactDinoState.dino ? contactDinoState.dino.x : contactRunnerState.targetX;
  contactRunnerState.transitionProgress = 0;
  contactRunnerState.distance = 0;
  contactRunnerState.score = 0;
  contactRunnerState.milestoneFlashTimer = 0;
  contactRunnerState.milestoneFlashValue = 0;
  contactRunnerState.lastMilestoneScore = 0;
  contactRunnerState.moonPhaseIndex = 0;
  contactRunnerState.moon = null;
  contactRunnerState.dinoVy = 0;
  contactRunnerState.obstacles = [];
  contactRunnerState.clouds = [];
  contactRunnerState.spawnTimer = 0.82;
  contactRunnerState.cloudSpawnTimer = 0.8;
  contactRunnerState.floorOffset = 0;
  contactRunnerState.isDucking = false;

  contactRunnerState.groundY = getRunnerGroundY();
  contactRunnerState.dinoY = contactRunnerState.groundY;

  const dino = contactDinoState.dino;
  if (dino) {
    dino.face = dino.x <= contactRunnerState.targetX ? 1 : -1;
    dino.roar = 0;
    dino.groundAt = buildContactDinoGroundAt(contactDinoState.height);
    dino.y = dino.groundAt(dino.x) - 46 * scale;
  }

  contactDinoState.pointer.down = false;
  lastDinoTapTime = 0;
  helpText.classList.remove("is-visible");
  ensureContactRunnerClouds();
  ensureContactRunnerMoon();
  updateContactRunnerHud();
}

function runnerJump() {
  getContactRunnerAudioContext();
  if (contactRunnerState.status !== "playing") return;
  if (contactRunnerState.dinoY >= contactRunnerState.groundY - 1) {
    const scale = contactDinoState.dino ? contactDinoState.dino.scale : 1;
    const dinoHeight = 55 * scale;
    const maxAllowedJump = Math.max(10, contactRunnerState.groundY - dinoHeight - 5);
    const desiredJump = 75 * scale;
    const jumpHeight = Math.min(desiredJump, maxAllowedJump);
    const gravity = 1800 * scale;
    contactRunnerState.dinoVy = -Math.sqrt(2 * gravity * jumpHeight);
  }
}

function spawnContactRunnerObstacle() {
  const type = Math.floor(Math.random() * 4);
  const scale = contactDinoState.dino ? contactDinoState.dino.scale : 1;

  let spriteKey;
  let width;
  let height;
  let y;
  let logicalType = 1;

  if (type === 3) {
    logicalType = 2;
    spriteKey = "birdDown";
    width = CONTACT_RUNNER_SPRITES.bird.drawWidth * scale;
    height = CONTACT_RUNNER_SPRITES.bird.drawHeight * scale;

    const heightLevel = Math.floor(Math.random() * 3);
    const birdHeights = [46, 95, 120];
    y = contactRunnerState.groundY - birdHeights[heightLevel] * scale;
  } else if (type === 2) {
    spriteKey = "cactus2";
    width = (CONTACT_RUNNER_SPRITES.cactusSmall.drawWidth * 2.2) * scale;
    height = CONTACT_RUNNER_SPRITES.cactusLarge.drawHeight * scale;
    y = contactRunnerState.groundY - height + 4 * scale;
  } else if (type === 1) {
    spriteKey = "cactus3";
    width = CONTACT_RUNNER_SPRITES.cactusLarge.drawWidth * scale;
    height = CONTACT_RUNNER_SPRITES.cactusLarge.drawHeight * scale;
    y = contactRunnerState.groundY - height + 4 * scale;
  } else {
    spriteKey = "cactus1";
    width = CONTACT_RUNNER_SPRITES.cactusSmall.drawWidth * scale;
    height = CONTACT_RUNNER_SPRITES.cactusSmall.drawHeight * scale;
    y = contactRunnerState.groundY - height + 4 * scale;
  }

  const hitInset = 2 * scale;

  contactRunnerState.obstacles.push({
    x: contactDinoState.width,
    y,
    width,
    height,
    type: logicalType,
    spriteKey,
    hitInset,
  });
}

function checkRunnerCollisions() {
  const dino = contactDinoState.dino;
  if (!dino) return;

  const scale = dino.scale;
  const isDucking = contactRunnerState.isDucking;

  const hitX = dino.x - 5 * scale;
  const hitY = dino.y - 25 * scale + (isDucking ? 20 * scale : 0);
  const hitWidth = 45 * scale;
  const hitHeight = isDucking ? 35 * scale : 55 * scale;

  for (const obstacle of contactRunnerState.obstacles) {
    const obstacleX = obstacle.x + obstacle.hitInset;
    const obstacleY = obstacle.y + obstacle.hitInset;
    const obstacleWidth = obstacle.width - obstacle.hitInset * 2;
    const obstacleHeight = obstacle.height - obstacle.hitInset * 2;

    if (
      hitX < obstacleX + obstacleWidth &&
      hitX + hitWidth > obstacleX &&
      hitY < obstacleY + obstacleHeight &&
      hitY + hitHeight > obstacleY
    ) {
      contactRunnerState.status = "gameover";
      contactRunnerState.speed = 0;
      contactDinoState.pointer.down = false;
      syncContactRunnerBestScore();
      break;
    }
  }
}

function updateContactRunner(dt) {
  const dino = contactDinoState.dino;
  if (!dino) return;

  const scale = dino.scale;
  updateContactRunnerMoon(dt);
  if (contactRunnerState.milestoneFlashTimer > 0) {
    contactRunnerState.milestoneFlashTimer = Math.max(
      0,
      contactRunnerState.milestoneFlashTimer - dt,
    );
  }

  if (contactRunnerState.status === "starting") {
    ensureContactRunnerClouds();
    const targetX = contactRunnerState.targetX || contactDinoState.width * 0.15;
    const totalDistance = Math.max(
      1,
      Math.abs(targetX - (contactRunnerState.transitionOriginX || 0)),
    );
    const direction = targetX >= dino.x ? 1 : -1;
    const moveAmount = contactRunnerState.startSpeed * dt;
    const nextX = dino.x + direction * moveAmount;
    const arrived = direction > 0 ? nextX >= targetX : nextX <= targetX;
    const remainingDistance = Math.abs(targetX - (arrived ? targetX : nextX));
    const rawProgress = 1 - remainingDistance / totalDistance;
    const transitionProgress = easeInOutValue(rawProgress);
    const contactGroundAt = buildContactDinoGroundAt(contactDinoState.height);
    dino.groundAt = (x) => lerpValue(contactGroundAt(x), contactRunnerState.groundY, transitionProgress);
    contactRunnerState.transitionProgress = transitionProgress;

    dino.face = direction;
    dino.drawFace = lerpValue(dino.drawFace, dino.face, 0.18);
    dino.x = arrived ? targetX : nextX;
    dino.y = dino.groundAt(dino.x) - 46 * scale;
    dino.walk += dt * (contactRunnerState.startSpeed * 0.013 / scale);

    const hipNearX = dino.x - dino.face * 10 * scale;
    const hipFarX = dino.x + dino.face * 22 * scale;
    const legPhase = dino.walk * 1.2;
    const stride = 26 * scale;
    const lift = 16 * scale;
    const currentBaseY = dino.groundAt(dino.x);

    dino.footBackNear.x = hipNearX - Math.cos(legPhase) * stride;
    dino.footBackNear.y = currentBaseY - Math.max(0, Math.sin(legPhase)) * lift;
    dino.footBackFar.x = hipFarX - Math.cos(legPhase + Math.PI) * stride;
    dino.footBackFar.y =
      currentBaseY - Math.max(0, Math.sin(legPhase + Math.PI)) * lift;
    dino.footBackNear.progress = 1;
    dino.footBackFar.progress = 1;

    for (let index = contactRunnerState.clouds.length - 1; index >= 0; index -= 1) {
      const cloud = contactRunnerState.clouds[index];
      cloud.x -= cloud.speed * dt * (0.2 + transitionProgress * 0.35);
      if (cloud.x + cloud.width < 0) {
        contactRunnerState.clouds.splice(index, 1);
      }
    }

    if (arrived) {
      contactRunnerState.status = "playing";
      contactRunnerState.speed = 350 * scale;
      contactRunnerState.groundY = getRunnerGroundY();
      contactRunnerState.dinoY = contactRunnerState.groundY;
      contactRunnerState.transitionProgress = 1;
      dino.groundAt = () => contactRunnerState.groundY;
      dino.y = contactRunnerState.groundY - 46 * scale;
      dino.face = 1;
      dino.drawFace = 1;
      ensureContactRunnerClouds();
    }
  } else if (contactRunnerState.status === "playing") {
    ensureContactRunnerClouds();
    contactRunnerState.speed += 25 * scale * dt;
    const maxSpeed = 800 * scale;
    if (contactRunnerState.speed > maxSpeed) {
      contactRunnerState.speed = maxSpeed;
    }

    const moveAmount = contactRunnerState.speed * dt;
    contactRunnerState.distance += moveAmount;
    contactRunnerState.floorOffset -= moveAmount;
    if (contactRunnerState.floorOffset < -100 * scale) {
      contactRunnerState.floorOffset += 100 * scale;
    }
    updateContactRunnerScore();

    contactRunnerState.dinoVy += 1800 * scale * dt;
    contactRunnerState.dinoY += contactRunnerState.dinoVy * dt;

    if (contactRunnerState.dinoY >= contactRunnerState.groundY) {
      contactRunnerState.dinoY = contactRunnerState.groundY;
      contactRunnerState.dinoVy = 0;
      dino.walk += dt * (contactRunnerState.speed * 0.012 / scale);
    }

    const targetX = contactDinoState.width * 0.15;
    dino.x += (targetX - dino.x) * 0.1;
    dino.y = contactRunnerState.dinoY - 46 * scale;
    dino.face = 1;
    dino.drawFace = 1;

    const hipNearX = dino.x - dino.face * 10 * scale;
    const hipFarX = dino.x + dino.face * 22 * scale;
    const legPhase = dino.walk * 1.2;
    const stride = 28 * scale;
    const lift = 22 * scale;
    const currentBaseY = contactRunnerState.dinoY;

    let airTuck = 0;
    if (contactRunnerState.dinoY < contactRunnerState.groundY) {
      const jumpHeight = contactRunnerState.groundY - contactRunnerState.dinoY;
      airTuck = Math.min(jumpHeight * 0.5, 15 * scale);
    }

    dino.footBackNear.x = hipNearX - Math.cos(legPhase) * stride;
    dino.footBackNear.y = currentBaseY - Math.max(0, Math.sin(legPhase)) * lift - airTuck;
    dino.footBackFar.x = hipFarX - Math.cos(legPhase + Math.PI) * stride;
    dino.footBackFar.y =
      currentBaseY - Math.max(0, Math.sin(legPhase + Math.PI)) * lift - airTuck;
    dino.footBackNear.progress = 1;
    dino.footBackFar.progress = 1;

    contactRunnerState.spawnTimer -= dt;
    if (contactRunnerState.spawnTimer <= 0) {
      spawnContactRunnerObstacle();
      const baseTime = 600 * scale / contactRunnerState.speed;
      contactRunnerState.spawnTimer = baseTime * (0.8 + Math.random() * 1.5);
    }

    contactRunnerState.cloudSpawnTimer -= dt;
    if (contactRunnerState.cloudSpawnTimer <= 0) {
      spawnContactRunnerCloud();
      contactRunnerState.cloudSpawnTimer = 2.2 + Math.random() * 1.8;
    }

    for (let index = contactRunnerState.obstacles.length - 1; index >= 0; index -= 1) {
      const obstacle = contactRunnerState.obstacles[index];
      obstacle.x -= moveAmount;
      if (obstacle.x + obstacle.width < 0) {
        contactRunnerState.obstacles.splice(index, 1);
      }
    }

    for (let index = contactRunnerState.clouds.length - 1; index >= 0; index -= 1) {
      const cloud = contactRunnerState.clouds[index];
      cloud.x -= cloud.speed * dt;
      if (cloud.x + cloud.width < 0) {
        contactRunnerState.clouds.splice(index, 1);
      }
    }

    checkRunnerCollisions();
  } else {
    ensureContactRunnerClouds();
    for (let index = contactRunnerState.clouds.length - 1; index >= 0; index -= 1) {
      const cloud = contactRunnerState.clouds[index];
      cloud.x -= cloud.speed * dt * 0.45;
      if (cloud.x + cloud.width < 0) {
        contactRunnerState.clouds.splice(index, 1);
      }
    }

    if (contactRunnerState.clouds.length < 2) {
      spawnContactRunnerCloud();
    }
  }

  dino.time += dt;
  dino.roar = Math.max(0, dino.roar - dt * 1.6);
  dino.blinkTimer -= dt;
  if (dino.blinkTimer <= 0) {
    dino.blink = 1;
    dino.blinkTimer = 1.6 + Math.random() * 2.2;
  }
  dino.blink = Math.max(0, dino.blink - dt * 7);

  const canvasRect = contactDinoCanvas.getBoundingClientRect();
  contactDinoState.snoutViewport.x = canvasRect.left + dino.x + 30 * scale;
  contactDinoState.snoutViewport.y = canvasRect.top + dino.y - 15 * scale;
}

function solveTwoBoneIK(root, target, len1, len2, bendDir = 1) {
  const dx = target.x - root.x;
  const dy = target.y - root.y;
  const distance = Math.max(0.0001, Math.min(Math.hypot(dx, dy), len1 + len2 - 0.001));
  const base = Math.atan2(dy, dx);
  let cosine = (len1 * len1 + distance * distance - len2 * len2) / (2 * len1 * distance);
  cosine = clampValue(cosine, -1, 1);
  const angle = Math.acos(cosine) * bendDir;
  return {
    x: root.x + Math.cos(base + angle) * len1,
    y: root.y + Math.sin(base + angle) * len1,
  };
}

class ContactFootStepper {
  constructor(x, y, stride, lift) {
    this.x = x;
    this.y = y;
    this.fromX = x;
    this.fromY = y;
    this.toX = x;
    this.toY = y;
    this.stride = stride;
    this.lift = lift;
    this.progress = 1;
  }

  update(anchorX, groundY, moveX, face, dt) {
    const desiredX = anchorX + face * this.stride;
    const tooFar = Math.abs(this.x - desiredX) > this.stride * 0.9;
    if (this.progress >= 1 && tooFar) {
      this.fromX = this.x;
      this.fromY = this.y;
      this.toX = anchorX + face * this.stride + moveX * 4.5;
      this.toY = groundY;
      this.progress = 0;
    }

    if (this.progress < 1) {
      this.progress = Math.min(1, this.progress + dt * 4.5);
      const arc = Math.sin(this.progress * Math.PI) * this.lift;
      this.x = lerpValue(this.fromX, this.toX, this.progress);
      this.y = lerpValue(this.fromY, this.toY, this.progress) - arc;
      return;
    }

    this.x = lerpValue(this.x, desiredX, 0.08);
    this.y = lerpValue(this.y, groundY, 0.22);
  }
}

function getContactDinoScale(width = contactDinoState.width || 420) {
  return Math.min(1.75, Math.max(1.28, width / 430));
}

function getContactDinoAnchorPoint() {
  return {
    x: Math.max(170, contactDinoState.width * 0.42),
    y: contactDinoState.height * 0.7,
  };
}

function getContactDinoParkedPoint() {
  return {
    x: -170 * getContactDinoScale(),
    y: contactDinoState.height * 0.72,
  };
}

function buildContactDinoGroundAt(height, flat = false) {
  if (flat) {
    return () => height * 0.84;
  }

  return (x) =>
    height * 0.84 + Math.sin(x * 0.024) * 5 + Math.sin(x * 0.009 + 1.2) * 4;
}

function updateContactDinoAnchors() {
  const anchorPoint = getContactDinoAnchorPoint();
  const parkedPoint = getContactDinoParkedPoint();
  contactDinoState.anchor.x = anchorPoint.x;
  contactDinoState.anchor.y = anchorPoint.y;
  contactDinoState.parked.x = parkedPoint.x;
  contactDinoState.parked.y = parkedPoint.y;
}

function placeContactDino(x, face = 1) {
  if (!contactDinoState.dino) {
    contactDinoState.dino = createContactDino();
  }

  const dino = contactDinoState.dino;
  dino.scale = getContactDinoScale();
  dino.x = x;
  dino.y = dino.groundAt(x) - 46 * dino.scale;
  dino.vx = 0;
  dino.vy = 0;
  dino.face = face;
  dino.drawFace = face;
  dino.roar = 0;
  dino.blink = 0;
  dino.walk = 0;

  dino.footBackNear = new ContactFootStepper(
    dino.x - face * 24 * dino.scale,
    dino.groundAt(dino.x - face * 24 * dino.scale),
    28 * dino.scale,
    16 * dino.scale,
  );
  dino.footBackFar = new ContactFootStepper(
    dino.x + face * 12 * dino.scale,
    dino.groundAt(dino.x + face * 12 * dino.scale),
    28 * dino.scale,
    16 * dino.scale,
  );
}

function updateContactDinoState(previousSection = "") {
  const showContact = state.activeSection === "contact";
  contactDinoState.visible = showContact;
  updateContactDinoAnchors();

  if (!contactDinoState.dino) {
    contactDinoState.dino = createContactDino();
    placeContactDino(contactDinoState.parked.x, -1);
  }

  if (showContact) {
    contactDinoState.renderVisible = true;
    contactDinoStage.classList.add("is-visible");
    contactDinoStage.setAttribute("aria-hidden", "false");

    if (previousSection !== "contact" || contactDinoState.mode === "parked") {
      stopContactRunner(true);
      placeContactDino(contactDinoState.parked.x, 1);
      contactDinoState.mode = "entering";
      contactDinoState.pointer.inside = false;
      contactDinoState.pointer.down = false;
      contactDinoState.waveRadius = 0;
      helpText.classList.remove("is-visible");
    }
    return;
  }

  if (
    previousSection === "contact" ||
    contactDinoState.mode === "active" ||
    contactDinoState.mode === "entering"
  ) {
    stopContactRunner(true);
    contactDinoState.renderVisible = true;
    contactDinoState.mode = "exiting";
    contactDinoState.pointer.inside = false;
    contactDinoState.pointer.down = false;
    contactDinoState.waveRadius = 0;
    helpText.classList.remove("is-visible");
    contactDinoStage.classList.add("is-visible");
    contactDinoStage.setAttribute("aria-hidden", "false");
    return;
  }

  if (contactDinoState.mode === "parked") {
    contactDinoState.renderVisible = false;
    helpText.classList.remove("is-visible");
    contactDinoStage.classList.remove("is-visible");
    contactDinoStage.setAttribute("aria-hidden", "true");
  }
}

function createContactDino() {
  const width = Math.max(280, contactDinoState.width || 420);
  const height = Math.max(140, contactDinoState.height || 220);
  const dino = {
    x: width * 0.42,
    y: height * 0.7,
    vx: 0,
    vy: 0,
    face: 1,
    drawFace: 1,
    walk: 0,
    time: 0,
    roar: 0,
    blink: 0,
    blinkTimer: 1.4,
    footBackNear: null,
    footBackFar: null,
    scale: getContactDinoScale(width),
  };

  const groundAt = buildContactDinoGroundAt(height);

  dino.groundAt = groundAt;
  dino.footBackNear = new ContactFootStepper(
    dino.x - 24 * dino.scale,
    groundAt(dino.x - 24 * dino.scale),
    28 * dino.scale,
    16 * dino.scale,
  );
  dino.footBackFar = new ContactFootStepper(
    dino.x + 12 * dino.scale,
    groundAt(dino.x + 12 * dino.scale),
    28 * dino.scale,
    16 * dino.scale,
  );
  return dino;
}

function resizeContactDinoCanvas() {
  if (!contactDinoCanvas || !contactDinoContext) return;

  const rect = contactDinoCanvas.getBoundingClientRect();
  const width = Math.max(220, Math.round(rect.width || 420));
  const height = Math.max(120, Math.round(rect.height || 220));
  const dpr = Math.min(window.devicePixelRatio || 1, 2);

  contactDinoState.width = width;
  contactDinoState.height = height;
  contactDinoState.dpr = dpr;
  contactDinoCanvas.width = Math.round(width * dpr);
  contactDinoCanvas.height = Math.round(height * dpr);
  contactDinoContext.setTransform(dpr, 0, 0, dpr, 0, 0);
  updateContactDinoAnchors();

  if (!contactDinoState.dino) {
    contactDinoState.dino = createContactDino();
    placeContactDino(contactDinoState.parked.x, -1);
  } else {
    contactDinoState.dino.scale = getContactDinoScale(width);
    if (contactRunnerState.status === "inactive") {
      contactDinoState.dino.groundAt = buildContactDinoGroundAt(height);
    } else {
      contactRunnerState.groundY = getRunnerGroundY();
      contactRunnerState.dinoY = Math.min(
        contactRunnerState.dinoY || contactRunnerState.groundY,
        contactRunnerState.groundY,
      );
      contactDinoState.dino.groundAt = () => contactRunnerState.groundY;
    }

    if (contactDinoState.mode === "parked" && !contactDinoState.renderVisible && contactRunnerState.status === "inactive") {
      placeContactDino(contactDinoState.parked.x, -1);
    }
  }

  if (!contactDinoState.pointer.inside) {
    contactDinoState.pointer.x = width * 0.68;
    contactDinoState.pointer.y = height * 0.58;
  }
}

function handleContactDinoPointerMove(event) {
  if (
    !contactDinoCanvas ||
    state.activeSection !== "contact" ||
    !contactDinoState.renderVisible ||
    contactDinoState.mode !== "active"
  ) {
    contactDinoState.pointer.inside = false;
    return;
  }

  const rect = contactDinoCanvas.getBoundingClientRect();
  const inside =
    event.clientX >= rect.left &&
    event.clientX <= rect.right &&
    event.clientY >= rect.top &&
    event.clientY <= rect.bottom;
  contactDinoState.pointer.inside = inside;
  if (!inside) return;
  contactDinoState.pointer.x = event.clientX - rect.left;
  contactDinoState.pointer.y = event.clientY - rect.top;
}

function handleContactDinoPointerDown(event) {
  if (
    !contactDinoCanvas ||
    state.activeSection !== "contact" ||
    contactDinoState.mode !== "active" ||
    !contactDinoState.dino
  ) return;

  const rect = contactDinoCanvas.getBoundingClientRect();
  const inside =
    event.clientX >= rect.left &&
    event.clientX <= rect.right &&
    event.clientY >= rect.top &&
    event.clientY <= rect.bottom;

  contactDinoState.pointer.inside = inside;
  if (!inside) return;

  contactDinoState.pointer.x = event.clientX - rect.left;
  contactDinoState.pointer.y = event.clientY - rect.top;

  const dino = contactDinoState.dino;
  const hitX = dino.x + dino.drawFace * 40 * dino.scale;
  const hitY = dino.y - 20 * dino.scale;
  const dx = contactDinoState.pointer.x - hitX;
  const dy = contactDinoState.pointer.y - hitY;
  const distance = Math.hypot(dx, dy);
  const isClickingDino = distance < 100 * dino.scale;

  if (contactRunnerState.status === "playing") {
    if (isClickingDino) {
      contactDinoState.pointer.down = true;
      dino.roar = 1;
    } else {
      runnerJump();
    }
    return;
  }

  if (contactRunnerState.status === "gameover") {
    startContactRunner();
    return;
  }

  if (contactRunnerState.status === "inactive" && isClickingDino) {
    contactDinoState.pointer.down = true;
    const now = performance.now();
    if (now - lastDinoTapTime < 400) {
      startContactRunner();
      lastDinoTapTime = 0;
    } else {
      lastDinoTapTime = now;
      dino.roar = 1;
    }
  }
}

function handleContactDinoPointerUp() {
  contactDinoState.pointer.down = false;
}

function getContactDinoSnoutOffset(face, scale) {
  return {
    x: face * 127 * scale,
    y: -37 * scale,
  };
}

function updateContactDino(dt) {
  const dino = contactDinoState.dino;
  if (!dino) return;

  dino.time += dt;
  dino.roar = Math.max(0, dino.roar - dt * 1.6);
  dino.blinkTimer -= dt;
  if (dino.blinkTimer <= 0) {
    dino.blink = 1;
    dino.blinkTimer = 1.6 + Math.random() * 2.2;
  }
  dino.blink = Math.max(0, dino.blink - dt * 7);
  updateContactDinoAnchors();

  let desiredFace = dino.face;
  let targetX = dino.x;
  let clampMinX = -220 * dino.scale;
  let clampMaxX = contactDinoState.width + 220 * dino.scale;

  if (contactDinoState.mode === "entering") {
    desiredFace = 1;
    targetX = contactDinoState.anchor.x;
  } else if (contactDinoState.mode === "exiting" || contactDinoState.mode === "parked") {
    desiredFace = -1;
    targetX = contactDinoState.parked.x;
  } else {
    const pointerInside = contactDinoState.pointer.inside;
    const targetSnoutX = pointerInside
      ? contactDinoState.pointer.x
      : contactDinoState.anchor.x + 88 * dino.scale + Math.sin(dino.time * 0.9) * 26;
    desiredFace = Math.abs(targetSnoutX - dino.x) > 6
      ? targetSnoutX >= dino.x
        ? 1
        : -1
      : dino.face;
    const snoutOffset = getContactDinoSnoutOffset(desiredFace, dino.scale);
    targetX = targetSnoutX - snoutOffset.x;
    const horizontalMargin = 134 * dino.scale;
    clampMinX = horizontalMargin;
    clampMaxX = contactDinoState.width - horizontalMargin;
  }

  const dx = targetX - dino.x;
  const accelX = clampValue(dx * 0.012, -0.92, 0.92);
  dino.vx += accelX;
  dino.vx *= 0.9;
  dino.x = clampValue(dino.x + dino.vx * 60 * dt, clampMinX, clampMaxX);

  dino.face = desiredFace;
  dino.drawFace = lerpValue(dino.drawFace, dino.face, 0.16);

  const bodyGround = dino.groundAt(dino.x);
  const targetY = bodyGround - 46 * dino.scale + Math.sin(dino.time * 4.8) * 1.2;
  dino.vy += (targetY - dino.y) * 0.06;
  dino.vy *= 0.8;
  dino.y += dino.vy * 60 * dt;

  const speed = Math.abs(dino.vx);
  dino.walk += dt * (2.2 + speed * 0.18);

  const hipNearX = dino.x - dino.face * 10 * dino.scale;
  const hipFarX = dino.x + dino.face * 22 * dino.scale;
  dino.footBackNear.update(hipNearX, dino.groundAt(hipNearX), dino.vx * 0.05, dino.face, dt);
  dino.footBackFar.update(hipFarX, dino.groundAt(hipFarX), dino.vx * 0.05, dino.face, dt);

  if (contactDinoState.mode === "entering" && Math.abs(dino.x - contactDinoState.anchor.x) < 16) {
    contactDinoState.mode = "active";
    helpText.classList.add("is-visible");
  }

  if (contactDinoState.mode === "exiting" && dino.x < contactDinoState.parked.x + 12) {
    contactDinoState.mode = "parked";
    contactDinoState.renderVisible = false;
    contactDinoState.pointer.inside = false;
    contactDinoState.pointer.down = false;
    contactDinoState.waveRadius = 0;
    helpText.classList.remove("is-visible");
    contactDinoStage.classList.remove("is-visible");
    contactDinoStage.setAttribute("aria-hidden", "true");
  }
}

function drawContactPolyline(points) {
  if (!points.length) return;
  contactDinoContext.beginPath();
  contactDinoContext.moveTo(points[0].x, points[0].y);
  for (let index = 1; index < points.length; index += 1) {
    contactDinoContext.lineTo(points[index].x, points[index].y);
  }
  contactDinoContext.stroke();
}

function drawContactDinoLeg(root, foot, upperLen, lowerLen, far = false) {
  const dino = contactDinoState.dino;
  const bend = dino.drawFace > 0 ? 1 : -1;
  const knee = solveTwoBoneIK(root, foot, upperLen, lowerLen, bend);
  contactDinoContext.strokeStyle = far ? "rgba(17,17,17,0.38)" : "rgba(17,17,17,0.92)";
  contactDinoContext.lineWidth = far ? 1.8 : 2.3;
  contactDinoContext.lineCap = "round";
  contactDinoContext.lineJoin = "round";
  contactDinoContext.beginPath();
  contactDinoContext.moveTo(root.x, root.y);
  contactDinoContext.lineTo(knee.x, knee.y);
  contactDinoContext.lineTo(foot.x, foot.y);
  contactDinoContext.stroke();

  contactDinoContext.lineWidth = far ? 1 : 1.2;
  contactDinoContext.beginPath();
  contactDinoContext.moveTo(foot.x - dino.drawFace * 4, foot.y);
  contactDinoContext.lineTo(foot.x + dino.drawFace * 4, foot.y);
  contactDinoContext.moveTo(foot.x - dino.drawFace * 1, foot.y + 1);
  contactDinoContext.lineTo(foot.x + dino.drawFace * 5, foot.y + 3);
  contactDinoContext.stroke();
}

function drawContactDinoArm(shoulder, phase, far = false) {
  const dino = contactDinoState.dino;
  const angle1 = -0.5 + Math.sin(phase) * 0.22;
  const angle2 = 0.9 + Math.cos(phase * 1.05) * 0.25;
  const elbow = {
    x: shoulder.x + Math.cos(angle1) * 12 * dino.drawFace,
    y: shoulder.y + Math.sin(angle1) * 12,
  };
  const hand = {
    x: elbow.x + Math.cos(angle1 + angle2) * 10 * dino.drawFace,
    y: elbow.y + Math.sin(angle1 + angle2) * 10,
  };

  contactDinoContext.strokeStyle = far ? "rgba(17,17,17,0.32)" : "rgba(17,17,17,0.86)";
  contactDinoContext.lineWidth = far ? 1.4 : 1.8;
  contactDinoContext.beginPath();
  contactDinoContext.moveTo(shoulder.x, shoulder.y);
  contactDinoContext.lineTo(elbow.x, elbow.y);
  contactDinoContext.lineTo(hand.x, hand.y);
  contactDinoContext.stroke();
}

function drawContactDinoHead(headBase, jawOpen) {
  const dino = contactDinoState.dino;
  const scale = dino.scale;
  const skull = { x: headBase.x + dino.drawFace * 22 * scale, y: headBase.y - 4 * scale };
  const snout = { x: skull.x + dino.drawFace * 26 * scale, y: skull.y + 5 * scale };
  const brow = { x: headBase.x + dino.drawFace * 7 * scale, y: headBase.y - 12 * scale };
  const jawEnd = {
    x: skull.x + dino.drawFace * 22 * scale,
    y: skull.y + 10 * scale + jawOpen,
  };

  contactDinoContext.strokeStyle = "rgba(17,17,17,0.94)";
  contactDinoContext.lineWidth = 2.2;
  drawContactPolyline([headBase, brow, skull, snout]);

  contactDinoContext.lineWidth = 1.7;
  drawContactPolyline([
    { x: headBase.x + dino.drawFace * 3 * scale, y: headBase.y + 1 * scale },
    {
      x: headBase.x + dino.drawFace * 10 * scale,
      y: headBase.y + 5 * scale + jawOpen * 0.2,
    },
    jawEnd,
  ]);

  contactDinoContext.lineWidth = 0.9;
  for (let index = 0; index < 4; index += 1) {
    const toothX = skull.x + dino.drawFace * (5 + index * 5) * scale;
    const toothY = skull.y + 5 * scale + index * 0.3 * scale;
    contactDinoContext.beginPath();
    contactDinoContext.moveTo(toothX, toothY);
    contactDinoContext.lineTo(
      toothX + dino.drawFace * 3 * scale,
      toothY + 3 * scale + jawOpen * 0.1,
    );
    contactDinoContext.stroke();
  }

  const eye = { x: headBase.x + dino.drawFace * 14 * scale, y: headBase.y - 7 * scale };
  if (contactRunnerState.status === "gameover") {
    contactDinoContext.lineWidth = 1.1;
    contactDinoContext.beginPath();
    contactDinoContext.moveTo(
      eye.x - dino.drawFace * 3 * scale,
      eye.y - 3 * scale,
    );
    contactDinoContext.lineTo(
      eye.x + dino.drawFace * 3 * scale,
      eye.y + 3 * scale,
    );
    contactDinoContext.moveTo(
      eye.x - dino.drawFace * 3 * scale,
      eye.y + 3 * scale,
    );
    contactDinoContext.lineTo(
      eye.x + dino.drawFace * 3 * scale,
      eye.y - 3 * scale,
    );
    contactDinoContext.stroke();
  } else if (dino.blink > 0) {
    contactDinoContext.lineWidth = 1;
    contactDinoContext.beginPath();
    contactDinoContext.moveTo(eye.x - dino.drawFace * 3 * scale, eye.y);
    contactDinoContext.lineTo(eye.x + dino.drawFace * 3 * scale, eye.y);
    contactDinoContext.stroke();
  } else {
    contactDinoContext.beginPath();
    contactDinoContext.arc(eye.x, eye.y, 1.8 * scale, 0, Math.PI * 2);
    contactDinoContext.fillStyle = "rgba(17,17,17,0.94)";
    contactDinoContext.fill();
  }

  if (dino.roar > 0) {
    const pulse = 1 - dino.roar;
    const waveDirection = dino.drawFace >= 0 ? 0 : Math.PI;
    const waveSpreadOuter = 0.5;
    const waveSpreadInner = 0.45;
    contactDinoContext.strokeStyle = `rgba(17,17,17,${(0.28 * dino.roar).toFixed(3)})`;
    contactDinoContext.lineWidth = 1.2;
    contactDinoContext.beginPath();
    contactDinoContext.arc(
      snout.x + dino.drawFace * 5 * scale,
      snout.y,
      10 * scale + pulse * 32,
      waveDirection - waveSpreadOuter,
      waveDirection + waveSpreadOuter,
    );
    contactDinoContext.stroke();
    contactDinoContext.beginPath();
    contactDinoContext.arc(
      snout.x + dino.drawFace * 5 * scale,
      snout.y,
      24 * scale + pulse * 86,
      waveDirection - waveSpreadInner,
      waveDirection + waveSpreadInner,
    );
    contactDinoContext.stroke();
  }

  const canvasRect = contactDinoCanvas.getBoundingClientRect();
  contactDinoState.snoutViewport.x = canvasRect.left + snout.x + dino.drawFace * 5 * scale;
  contactDinoState.snoutViewport.y = canvasRect.top + snout.y;
  contactDinoState.waveRadius =
    dino.roar > 0 ? 42 * scale + (1 - dino.roar) * 360 : 0;
}

function renderContactDino() {
  if (!contactDinoContext || !contactDinoState.dino) return;

  const { width, height } = contactDinoState;
  contactDinoContext.clearRect(0, 0, width, height);
  if (!contactDinoState.renderVisible) {
    contactDinoState.waveRadius = 0;
    return;
  }

  const dino = contactDinoState.dino;
  const scale = dino.scale;
  const runnerSceneBlend =
    contactRunnerState.status === "starting"
      ? contactRunnerState.transitionProgress
      : contactRunnerState.status === "playing" || contactRunnerState.status === "gameover"
        ? 1
        : 0;
  const runnerSceneActive = runnerSceneBlend > 0.001;
  if (runnerSceneActive && contactRunnerState.moon) {
    contactDinoContext.save();
    contactDinoContext.globalAlpha = clampValue(runnerSceneBlend * 0.88, 0, 0.88);
    drawContactRunnerSprite(
      contactDinoContext,
      contactRunnerState.moon.sprite,
      contactRunnerState.moon.x,
      contactRunnerState.moon.y,
      scale,
    );
    contactDinoContext.restore();
  }
  if (runnerSceneActive && contactRunnerState.clouds.length) {
    contactDinoContext.save();
    contactDinoContext.globalAlpha = clampValue(runnerSceneBlend * 0.92, 0, 0.92);
    for (const cloud of contactRunnerState.clouds) {
      drawContactRunnerSprite(
        contactDinoContext,
        CONTACT_RUNNER_SPRITES.cloud,
        cloud.x,
        cloud.y,
        scale,
      );
    }
    contactDinoContext.restore();
  }

  if (runnerSceneActive) {
    const groundY = contactRunnerState.groundY;
    const horizonSprite = CONTACT_RUNNER_SPRITES.horizon;
    const horizonWidth = horizonSprite.drawWidth * scale;
    const horizonY = groundY - horizonSprite.drawHeight * scale + 3 * scale;
    let horizonX = -((contactRunnerState.floorOffset % horizonWidth) + horizonWidth) % horizonWidth;
    let drewHorizon = false;

    contactDinoContext.save();
    contactDinoContext.globalAlpha = runnerSceneBlend;
    while (horizonX < width + horizonWidth) {
      drewHorizon = drawContactRunnerSprite(
        contactDinoContext,
        horizonSprite,
        horizonX,
        horizonY,
        scale,
      ) || drewHorizon;
      horizonX += horizonWidth;
    }

    if (!drewHorizon) {
      contactDinoContext.fillStyle = "rgba(17,17,17,0.8)";
      contactDinoContext.fillRect(0, groundY, width, 1.5 * scale);

      const pixelSize = 2 * scale;
      for (let index = 0; index < width; index += pixelSize) {
        let groundX = (index + contactRunnerState.floorOffset) % width;
        if (groundX < 0) {
          groundX += width;
        }

        const hash = Math.sin(index * 12.9898) * 43758.5453;
        const randomness = hash - Math.floor(hash);
        if (randomness < 0.03) {
          contactDinoContext.fillRect(
            groundX,
            groundY + pixelSize * (Math.floor(randomness * 100) % 3 + 1),
            pixelSize,
            pixelSize,
          );
        } else if (randomness < 0.05) {
          contactDinoContext.fillRect(
            groundX,
            groundY + pixelSize * (Math.floor(randomness * 100) % 2 + 1),
            pixelSize * 2,
            pixelSize,
          );
        } else if (randomness < 0.06) {
          contactDinoContext.fillRect(
            groundX,
            groundY + pixelSize * 3,
            pixelSize * 3,
            pixelSize,
          );
        }
      }
    }
    contactDinoContext.restore();

    for (const obstacle of contactRunnerState.obstacles) {
      if (obstacle.type === 2) {
        const frame = Math.floor(contactRunnerState.distance / 60) % 2;
        drawContactRunnerSprite(
          contactDinoContext,
          CONTACT_RUNNER_SPRITES.bird,
          obstacle.x,
          obstacle.y,
          scale,
          frame,
        );
      } else if (obstacle.spriteKey === "cactus1") {
        drawContactRunnerSprite(
          contactDinoContext,
          CONTACT_RUNNER_SPRITES.cactusSmall,
          obstacle.x,
          obstacle.y,
          scale,
        );
      } else if (obstacle.spriteKey === "cactus3") {
        drawContactRunnerSprite(
          contactDinoContext,
          CONTACT_RUNNER_SPRITES.cactusLarge,
          obstacle.x,
          obstacle.y,
          scale,
        );
      } else {
        const firstX = obstacle.x;
        const secondX = obstacle.x + CONTACT_RUNNER_SPRITES.cactusSmall.drawWidth * 0.8 * scale;
        drawContactRunnerSprite(
          contactDinoContext,
          CONTACT_RUNNER_SPRITES.cactusSmall,
          firstX,
          obstacle.y + 12 * scale,
          scale,
        );
        drawContactRunnerSprite(
          contactDinoContext,
          CONTACT_RUNNER_SPRITES.cactusLarge,
          secondX,
          obstacle.y,
          scale,
        );
      }
    }
  }

  if (runnerSceneBlend < 0.999) {
    contactDinoContext.save();
    contactDinoContext.globalAlpha = clampValue(1 - runnerSceneBlend * 0.9, 0.12, 1);
    contactDinoContext.strokeStyle = "rgba(17,17,17,0.14)";
    contactDinoContext.lineWidth = 1;
    contactDinoContext.beginPath();
    for (let x = 0; x <= width; x += 8) {
      const y = dino.groundAt(x);
      if (x === 0) {
        contactDinoContext.moveTo(x, y);
      } else {
        contactDinoContext.lineTo(x, y);
      }
    }
    contactDinoContext.stroke();
    contactDinoContext.restore();
  }

  const bob = Math.sin(dino.walk * 2.4) * Math.min(4.5 * scale, Math.abs(dino.vx) * 0.18);
  const duckOffset = contactRunnerState.status !== "inactive" && contactRunnerState.isDucking
    ? 18 * scale
    : 0;
  const hip = { x: dino.x, y: dino.y + bob + duckOffset * 0.5 };
  const chest = { x: hip.x + dino.drawFace * 40 * scale, y: hip.y - 15 * scale + duckOffset };
  const neck1 = { x: chest.x + dino.drawFace * 16 * scale, y: chest.y - 10 * scale + duckOffset };
  const neck2 = { x: neck1.x + dino.drawFace * 12 * scale, y: neck1.y - 12 * scale + duckOffset };
  const headBase = { x: neck2.x + dino.drawFace * 6 * scale, y: neck2.y - 1 * scale + duckOffset };
  const tail1 = { x: hip.x - dino.drawFace * 30 * scale, y: hip.y - 8 * scale };
  const tail2 = {
    x: tail1.x - dino.drawFace * 34 * scale,
    y: tail1.y - 4 * scale + Math.sin(dino.walk) * 7 * scale,
  };
  const tail3 = {
    x: tail2.x - dino.drawFace * 36 * scale,
    y: tail2.y + Math.sin(dino.walk + 0.8) * 9 * scale,
  };

  const hipFar = { x: hip.x + dino.drawFace * 8 * scale, y: hip.y + 3 * scale };
  const hipNear = { x: hip.x - dino.drawFace * 6 * scale, y: hip.y + 4 * scale };
  const shoulderFar = { x: chest.x - dino.drawFace * 7 * scale, y: chest.y + 5 * scale };
  const shoulderNear = { x: chest.x - dino.drawFace * 1 * scale, y: chest.y + 7 * scale };

  drawContactDinoLeg(
    hipFar,
    { x: dino.footBackFar.x, y: dino.footBackFar.y },
    26 * scale,
    24 * scale,
    true,
  );
  drawContactDinoArm(shoulderFar, dino.walk + Math.PI, true);

  contactDinoContext.strokeStyle = "rgba(17,17,17,0.94)";
  contactDinoContext.lineWidth = 2.5;
  contactDinoContext.lineCap = "round";
  contactDinoContext.lineJoin = "round";
  drawContactPolyline([tail3, tail2, tail1, hip, chest, neck1, neck2, headBase]);

  contactDinoContext.lineWidth = 1.2;
  drawContactPolyline([
    { x: hip.x + dino.drawFace * 7 * scale, y: hip.y + 11 * scale },
    { x: chest.x - dino.drawFace * 6 * scale, y: chest.y + 12 * scale },
    { x: neck1.x - dino.drawFace * 2 * scale, y: neck1.y + 8 * scale },
  ]);

  drawContactDinoLeg(
    hipNear,
    { x: dino.footBackNear.x, y: dino.footBackNear.y },
    28 * scale,
    26 * scale,
    false,
  );
  drawContactDinoArm(shoulderNear, dino.walk, false);

  const jawOpen = contactDinoState.pointer.down
    ? 12 * scale
    : dino.roar > 0
      ? 8 * scale
      : 0;
  drawContactDinoHead(headBase, jawOpen);
}

function runContactDinoLoop(now) {
  const dt = contactDinoState.lastAt
    ? Math.min(0.033, (now - contactDinoState.lastAt) / 1000)
    : 0.016;
  contactDinoState.lastAt = now;
  try {
    if (contactRunnerState.status === "inactive") {
      updateContactDino(dt);
    } else {
      updateContactRunner(dt);
    }
    renderContactDino();
    updateContactRunnerHud();
    updateContactTextBlast();
  } catch (error) {
    console.error("Contact dino loop failed:", error);
    contactDinoState.signalEffectEnabled = false;
    restoreContactEffectText();
  }
  contactDinoState.rafId = window.requestAnimationFrame(runContactDinoLoop);
}

function prepareContactTextLetters() {
  prepareWrappedTextLetters(contactPanel.querySelectorAll(".contact-line, .contact-kicker"), {
    stateKey: "contactTextItems",
    readyFlag: "blastReady",
    charsProperty: "_contactChars",
    onReady: (item) => {
      contactTextFractureState.set(item, {
        intensity: 0,
        impactX: 0,
        impactY: 0,
        active: false,
      });
    },
  });
}

function getContactTextChars(item) {
  return getWrappedTextChars(item, "_contactChars");
}

function resetContactTextNode(node) {
  setNodeTextValue(node, getStaticCharValue(node));
  clearNodeStyleValue(node, "--contact-blast-x");
  clearNodeStyleValue(node, "--contact-blast-y");
  clearNodeStyleValue(node, "--contact-blast-rotate");
  clearNodeStyleValue(node, "--contact-blast-opacity");
  clearNodeStyleValue(node, "--contact-blast-blur");
  clearNodeStyleValue(node, "--contact-blast-scale");
}

function queueContactIntroScramble() {
  queueTextIntroScramble({
    items: state.contactTextItems,
    getChars: getContactTextChars,
    timerKey: "contactIntroScrambleTimerId",
    rafKey: "contactIntroScrambleRafId",
  });
}

function restoreContactEffectText() {
  state.contactTextItems.forEach((item) => {
    item.classList.remove("is-blasted");
    getContactTextChars(item).forEach(resetContactTextNode);
    const blast = contactTextFractureState.get(item);
    if (blast) blast.active = false;
  });
}

function restoreNavEffectText() {
  navButtons.forEach((button) => {
    button.classList.remove("is-fractured");
    getNavButtonChars(button).forEach(resetNavTextNode);
    const fracture = navFractureState.get(button);
    if (fracture) fracture.active = false;
  });
}

function invalidateContactTextMetrics() {
  state.contactTextItems.forEach((item) => {
    contactTextLayoutCache.delete(item);
  });
}

function getContactTextMetrics(item) {
  const cached = contactTextLayoutCache.get(item);
  if (cached) return cached;

  const itemRect = item.getBoundingClientRect();
  const chars = getContactTextChars(item).map((char, index) => {
    const charRect = char.getBoundingClientRect();
    return {
      node: char,
      index,
      isSpace: char.classList.contains("is-space"),
      centerOffsetX: charRect.left + charRect.width * 0.5 - itemRect.left,
      centerOffsetY: charRect.top + charRect.height * 0.5 - itemRect.top,
    };
  });

  const metrics = { chars };
  contactTextLayoutCache.set(item, metrics);
  return metrics;
}

function setContactTextBlast(
  item,
  intensity,
  impactX,
  impactY,
  metrics = null,
  itemRect = null,
) {
  if (intensity < 0.03) {
    item.classList.remove("is-blasted");
    getContactTextChars(item).forEach(resetContactTextNode);
    return;
  }

  const activeMetrics = metrics || getContactTextMetrics(item);
  if (!activeMetrics.chars.length) return;

  item.classList.add("is-blasted");
  const activeRect = itemRect || item.getBoundingClientRect();
  activeMetrics.chars.forEach(({ node, index, isSpace, centerOffsetX, centerOffsetY }) => {
    if (isSpace) {
      setNodeTextValue(node, "\u00a0");
      setNodeStyleValue(node, "--contact-blast-x", "0px");
      setNodeStyleValue(node, "--contact-blast-y", "0px");
      setNodeStyleValue(node, "--contact-blast-rotate", "0deg");
      setNodeStyleValue(node, "--contact-blast-opacity", "1");
      setNodeStyleValue(node, "--contact-blast-blur", "0px");
      setNodeStyleValue(node, "--contact-blast-scale", "1");
      return;
    }

    const centerX = activeRect.left + centerOffsetX;
    const centerY = activeRect.top + centerOffsetY;
    const dx = centerX - impactX;
    const dy = centerY - impactY;
    const distance = Math.hypot(dx, dy) || 1;
    const reach = 110 + intensity * 36;
    const falloff = Math.max(0, 1 - distance / reach);
    const signal = clampValue((intensity / 5.4) * falloff * 1.65, 0, 1);
    setNodeTextValue(node, resolveSignalScrambleChar(
      node.dataset.char || "",
      index,
      signal,
      contactDinoState.lastAt,
      Math.round(distance * 0.08),
    ));
    setNodeStyleValue(node, "--contact-blast-x", "0px");
    setNodeStyleValue(node, "--contact-blast-y", "0px");
    setNodeStyleValue(node, "--contact-blast-rotate", "0deg");
    setNodeStyleValue(node, "--contact-blast-opacity", `${(1 - signal * 0.08).toFixed(2)}`);
    setNodeStyleValue(node, "--contact-blast-blur", "0px");
    setNodeStyleValue(node, "--contact-blast-scale", "1");
  });
}

function updateContactTextBlast() {
  if (!contactDinoState.signalEffectEnabled) {
    restoreContactEffectText();
    return;
  }

  const items = state.contactTextItems;
  const isRoaring = state.activeSection === "contact" && contactDinoState.waveRadius > 0;
  const isPlaying = state.activeSection === "contact" && contactRunnerState.status === "playing";
  const active = isRoaring || isPlaying;
  let hasVisibleBlast = false;
  let trackX = contactDinoState.snoutViewport.x;
  let trackY = contactDinoState.snoutViewport.y;

  if (contactDinoState.dino) {
    const scale = contactDinoState.dino.scale;
    const canvasRect = contactDinoCanvas.getBoundingClientRect();
    trackX = canvasRect.left + contactDinoState.dino.x + 15 * scale;
    trackY = canvasRect.top + contactDinoState.dino.y - 20 * scale;
  }

  items.forEach((item) => {
    const blast =
      contactTextFractureState.get(item) || { intensity: 0, impactX: 0, impactY: 0, active: false };

    if (!active) {
      if (blast.intensity < 0.03 && !blast.active) {
        return;
      }
      blast.intensity += (0 - blast.intensity) * 0.18;
      if (blast.intensity < 0.03) {
        blast.intensity = 0;
        if (blast.active) {
          setContactTextBlast(item, 0, blast.impactX, blast.impactY);
          blast.active = false;
        }
        contactTextFractureState.set(item, blast);
        return;
      }
      setContactTextBlast(item, blast.intensity, blast.impactX, blast.impactY);
      blast.active = true;
      hasVisibleBlast = true;
      contactTextFractureState.set(item, blast);
      return;
    }

    const rect = item.getBoundingClientRect();
    const metrics = getContactTextMetrics(item);
    let targetIntensity = 0;
    let currentImpactX = blast.impactX;
    let currentImpactY = blast.impactY;

    if (isRoaring) {
      const centerX = rect.left + rect.width * 0.5;
      const centerY = rect.top + rect.height * 0.5;
      const distance = Math.hypot(
        centerX - contactDinoState.snoutViewport.x,
        centerY - contactDinoState.snoutViewport.y,
      );
      const band = 120;
      targetIntensity = Math.max(
        targetIntensity,
        Math.min(5.4, (band - Math.abs(distance - contactDinoState.waveRadius)) / 18),
      );
      currentImpactX = contactDinoState.snoutViewport.x;
      currentImpactY = contactDinoState.snoutViewport.y;
    }

    if (isPlaying) {
      let minCharDistance = Number.POSITIVE_INFINITY;
      metrics.chars.forEach((charMetric) => {
        if (charMetric.isSpace) return;
        const charX = rect.left + charMetric.centerOffsetX;
        const charY = rect.top + charMetric.centerOffsetY;
        const distance = Math.hypot(charX - trackX, charY - trackY);
        if (distance < minCharDistance) {
          minCharDistance = distance;
        }
      });

      const auraRadius = 110 * (contactDinoState.dino ? contactDinoState.dino.scale : 1);
      if (minCharDistance < auraRadius) {
        const playIntensity = Math.max(0, Math.min(5.4, (auraRadius - minCharDistance) / 12));
        if (playIntensity > targetIntensity) {
          targetIntensity = playIntensity;
          currentImpactX = trackX;
          currentImpactY = trackY;
        }
      }
    }

    blast.intensity +=
      (targetIntensity - blast.intensity) *
      (targetIntensity > blast.intensity ? 0.35 : 0.12);
    blast.impactX += (currentImpactX - blast.impactX) * 0.3;
    blast.impactY += (currentImpactY - blast.impactY) * 0.3;
    if (blast.intensity < 0.03) {
      blast.intensity = 0;
      if (blast.active) {
        setContactTextBlast(item, 0, blast.impactX, blast.impactY);
        blast.active = false;
      }
      contactTextFractureState.set(item, blast);
      return;
    }

    setContactTextBlast(item, blast.intensity, blast.impactX, blast.impactY, metrics, rect);
    blast.active = true;
    hasVisibleBlast = true;
    contactTextFractureState.set(item, blast);
  });

  contactPanel.classList.toggle("is-blasted", hasVisibleBlast);
}
