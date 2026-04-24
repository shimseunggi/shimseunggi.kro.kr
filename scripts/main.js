initializeContactRunnerAssets();
initializeAboutPanel();
prepareNavButtonLetters();
prepareAboutTextLetters();
prepareContactTextLetters();
initializeLizardCanvas();
resizeContactDinoCanvas();
contactDinoState.rafId = window.requestAnimationFrame(runContactDinoLoop);
syncNavigationFromHash();

window.addEventListener("beforeunload", cleanupSource);
window.addEventListener("pageshow", queueNavIntroScramble, { once: true });
window.addEventListener("resize", () => {
  invalidateNavFractureMetrics();
  invalidateContactTextMetrics();
  resizeLizardCanvas();
  resizeContactDinoCanvas();
  updateContactRunnerHud();
  updateProjectDialLayout();
  updateNavButtonContrast(state.lastFrame);
  updateProjectDial(true);
});
window.addEventListener("hashchange", syncNavigationFromHash);
window.addEventListener("pointermove", handleLizardPointerMove, { passive: true });
window.addEventListener("pointerdown", handleLizardPointerDown, { passive: true });
window.addEventListener("pointerup", handleLizardPointerUp, { passive: true });
window.addEventListener("pointercancel", handleLizardPointerUp, { passive: true });
window.addEventListener("touchstart", handleLizardTouch, { passive: true });
window.addEventListener("touchmove", handleLizardTouch, { passive: true });
window.addEventListener("pointermove", handleContactDinoPointerMove, { passive: true });
window.addEventListener("pointerdown", handleContactDinoPointerDown, { passive: true });
window.addEventListener("pointerup", handleContactDinoPointerUp, { passive: true });
document.addEventListener("visibilitychange", handleVisibilityChange);

if (document.fonts?.ready) {
  document.fonts.ready.then(() => {
    invalidateNavFractureMetrics();
    invalidateContactTextMetrics();
    updateHomeLizardAnchors();
    updateProjectDialLayout();
    if (shouldKeepLizardLoopRunning()) {
      startLizardLoop();
    }
  });
}

navButtons.forEach((button) => {
  button.addEventListener("click", () => {
    setActiveSection(button.dataset.section, true);
  });
});

stickerStage.addEventListener("click", () => {
  hideSticker();
});
stickerCard.addEventListener("click", () => {
  hideSticker();
});
stickerStage.addEventListener("pointermove", handleStickerPointerMove);
stickerStage.addEventListener("pointerleave", resetStickerTilt);
window.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && state.stickerVisible) {
    hideSticker();
  }
});
window.addEventListener("keydown", (event) => {
  if (state.activeSection !== "contact") return;

  if (event.code === "Escape" && contactRunnerState.status !== "inactive") {
    event.preventDefault();
    contactDinoState.pointer.down = false;
    stopContactRunner(true);
  } else if (event.code === "Space" || event.code === "ArrowUp") {
    event.preventDefault();
    if (contactRunnerState.status === "inactive" || contactRunnerState.status === "gameover") {
      startContactRunner();
    } else if (contactRunnerState.status === "playing") {
      runnerJump();
    }
  } else if (
    (event.code === "Enter" || event.code === "NumpadEnter") &&
    contactRunnerState.status === "gameover"
  ) {
    event.preventDefault();
    startContactRunner();
  } else if (event.code === "ArrowDown" && contactRunnerState.status === "playing") {
    event.preventDefault();
    contactRunnerState.isDucking = true;
  }
});
window.addEventListener("keyup", (event) => {
  if (event.code === "ArrowDown") {
    contactRunnerState.isDucking = false;
  }
});
contactRunnerRestart.addEventListener("click", () => {
  if (state.activeSection !== "contact") return;
  startContactRunner();
  contactRunnerRestart.blur();
});

initializeProjectDial();
contactRunnerState.bestScore = loadContactRunnerBestScore();
updateContactRunnerHud();
state.projectOrbitRafId = window.requestAnimationFrame(runProjectOrbitLoop);
initialize().catch((error) => {
  console.error(error);
  paintBlankFrame();
});
