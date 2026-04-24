function initializeAboutPanel() {
  aboutPanel.textContent = "";
  ABOUT_CONTENT.forEach(({ type, column = "right", text }) => {
    const item = document.createElement("div");
    item.className = `${type === "kicker" ? "contact-kicker" : "contact-line"} about-item is-${column}`;
    item.textContent = text;
    aboutPanel.append(item);
  });
}

function prepareAboutTextLetters() {
  prepareWrappedTextLetters(aboutPanel.querySelectorAll(".contact-line, .contact-kicker"), {
    stateKey: "aboutTextItems",
    readyFlag: "aboutReady",
    charsProperty: "_aboutChars",
  });
}

function getAboutTextChars(item) {
  return getWrappedTextChars(item, "_aboutChars");
}

function queueAboutIntroScramble() {
  queueTextIntroScramble({
    items: state.aboutTextItems,
    getChars: getAboutTextChars,
    timerKey: "aboutIntroScrambleTimerId",
    rafKey: "aboutIntroScrambleRafId",
    revealDirection: "ltr",
  });
}
