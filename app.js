(() => {
  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => Array.from(root.querySelectorAll(selector));

  const state = {
    closure: false,
    lowBandwidth: false,
    language: "en",
    surge: 18,
    cold: 64,
    weather: 48,
    toastTimer: null,
  };

  const toast = (message) => {
    const node = $("#toast");
    $("#toastText").textContent = message;
    node.classList.add("visible");
    clearTimeout(state.toastTimer);
    state.toastTimer = setTimeout(() => node.classList.remove("visible"), 2600);
  };

  const formatTime = () => new Intl.DateTimeFormat("en-IN", { hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false }).format(new Date());

  function updateForecast() {
    const modifier = 1 + state.surge / 100 * 0.52 + state.cold / 100 * 0.32 + (state.closure ? 0.08 : 0);
    const base = { I: 11.2, III: 5.1, V: 8.7 };
    const values = {};
    $$(".forecast-row").forEach((row) => {
      const key = row.dataset.class;
      const days = Math.max(1.3, base[key] / modifier);
      values[key] = days;
      const rounded = Math.max(1, Math.round(days));
      const dayNode = $(".forecast-days", row);
      dayNode.innerHTML = `${rounded}<span>d</span>`;
      dayNode.classList.toggle("urgent", days < 4.2 || key === "III");
      const bar = $(".forecast-bar span", row);
      bar.style.width = `${Math.min(100, days / 14 * 100)}%`;
    });
    const fuel = values.III.toFixed(1);
    const rations = values.I.toFixed(1);
    const ammo = values.V.toFixed(1);
    $("#fuelDepletion").textContent = `${fuel} days`;
    $("#rationDepletion").textContent = `${rations} days`;
    $("#ammoDepletion").textContent = `${ammo} days`;
    $("#calloutDays").textContent = `${fuel} days`;
    const marker = Math.max(14, Math.min(82, (4.2 / Math.max(1, values.III * 1.7)) * 100));
    $("#timelineMarker").style.left = `${marker}%`;
    $("#safeSegment").style.width = `${Math.max(18, marker)}%`;
    $("#watchSegment").style.width = `${Math.max(14, 40 - marker / 3)}%`;
    $("#dangerSegment").style.width = `${Math.max(16, 100 - marker - Math.max(14, 40 - marker / 3))}%`;
    $("#timelineLabel").textContent = `${state.weather}-hour scenario`;
  }

  function setClosure(value, notify = true) {
    state.closure = value;
    $("#tacticalMap").classList.toggle("closed", value);
    $("#mapStatus").textContent = value ? "Primary pass blocked · fallback active" : "Weather watch active";
    $("#blockedLabel").textContent = value ? "01 blocked" : "00 blocked";
    $("#simulateButton span:last-child").textContent = value ? "Clear pass simulation" : "Simulate pass closure";
    $("#linkModeLabel").textContent = state.lowBandwidth ? "SATCOM · 24 kbps" : "SATCOM · 64 kbps";
    updateForecast();
    if (notify) toast(value ? "Zoji La closed in simulation · air corridor activated" : "Primary route restored · simulation cleared");
  }

  $("#simulateButton").addEventListener("click", () => { setClosure(!state.closure); $("#routing").scrollIntoView({ behavior: "smooth", block: "center" }); });
  $("#mapReset").addEventListener("click", () => setClosure(false));
  $("#dismissAlert").addEventListener("click", () => setClosure(false));

  $("#linkModeToggle").addEventListener("click", () => {
    state.lowBandwidth = !state.lowBandwidth;
    document.body.classList.toggle("low-bandwidth", state.lowBandwidth);
    $("#linkModeToggle").setAttribute("aria-pressed", String(state.lowBandwidth));
    $("#linkDot").className = `status-dot ${state.lowBandwidth ? "warning" : "online"}`;
    $("#linkModeLabel").textContent = state.lowBandwidth ? "SATCOM · 24 kbps" : "SATCOM · 64 kbps";
    $("#meshState").textContent = state.lowBandwidth ? "4 nodes · 3 queued" : "4 nodes · 0 conflicts";
    toast(state.lowBandwidth ? "Tactical low-bandwidth mode enabled" : "Full link restored · mesh reconciled");
  });

  $("#syncButton").addEventListener("click", () => {
    const button = $("#syncButton");
    button.disabled = true;
    button.querySelector("span:last-child").textContent = "Syncing…";
    setTimeout(() => {
      $("#lastSync").textContent = formatTime();
      button.disabled = false;
      button.querySelector("span:last-child").textContent = "Sync now";
      if (state.lowBandwidth) {
        $("#meshState").textContent = "4 nodes · 0 conflicts";
        toast("CRDT edge queue reconciled over SATCOM");
      } else toast("Supply state synced from connected nodes");
    }, 900);
  });

  const sliderConfig = [
    ["#surgeRange", "#surgeOutput", (value) => `+${value}%`],
    ["#coldRange", "#coldOutput", (value) => `${value}%`],
    ["#weatherRange", "#weatherOutput", (value) => `${value} hrs`],
  ];
  sliderConfig.forEach(([inputSelector, outputSelector, format]) => {
    const input = $(inputSelector); const output = $(outputSelector);
    input.addEventListener("input", () => {
      const value = Number(input.value);
      output.textContent = format(value);
      if (inputSelector.includes("surge")) state.surge = value;
      if (inputSelector.includes("cold")) state.cold = value;
      if (inputSelector.includes("weather")) state.weather = value;
      updateForecast();
    });
  });

  $("#refreshDispatch").addEventListener("click", () => {
    const footer = $(".capacity-bar i");
    footer.style.width = "79%";
    setTimeout(() => { footer.style.width = "72%"; }, 850);
    toast("Dispatch priorities recalculated from live modifiers");
  });
  $("#matrixButton").addEventListener("click", () => toast("Substitution matrix: 12 approved fallback pairs loaded"));
  $("#forecastInfo").addEventListener("click", () => toast("Forecast uses demand, terrain and cold-surge modifiers"));
  $("#verifyButton").addEventListener("click", () => {
    const node = $(".audit-node.live");
    node.classList.remove("live"); node.classList.add("complete");
    $(".audit-node.live > span", node).textContent = "✓";
    $(".audit-node.live small", node).textContent = "QR-77A9 · hash matched";
    $(".audit-node.live time", node).textContent = formatTime().slice(0, 5);
    $(".audit-status").innerHTML = '<span class="status-dot online"></span> VERIFIED';
    toast("Integrity chain verified · no mismatch detected");
  });

  const queryInput = $("#voiceQuery");
  const answerQuery = (query) => {
    const lower = query.toLowerCase();
    let answer = "Network ready. Try asking for fuel, reserve or pass status.";
    if (lower.includes("fuel") || lower.includes("diesel") || lower.includes("ईंधन")) answer = `Kargil / Drass Class III fuel cover is ${$("#fuelDepletion").textContent}; P1 movement is queued from Leh.`;
    else if (lower.includes("ammo") || lower.includes("ordnance") || lower.includes("class v")) answer = `Class V protected reserve is ${$("#ammoDepletion").textContent} under the current scenario. Priority remains P2.`;
    else if (lower.includes("zoji") || lower.includes("pass") || lower.includes("ला खुला") || lower.includes("route")) answer = state.closure ? "Zoji La is blocked in the simulation. Blue dotted air corridor is the recommended fallback." : "Zoji La is open in the base scenario, with a 64% weather watch risk.";
    else if (lower.includes("ration") || lower.includes("water") || lower.includes("राशन")) answer = `Class I rations and water cover is ${$("#rationDepletion").textContent}; no immediate stockout is projected.`;
    $("#voiceResponse").innerHTML = `<span class="response-dot"></span><span>${answer}</span><small>SECURE REPLY · ${formatTime().slice(0, 5)}</small>`;
  };
  $$(".query-chips button").forEach((chip) => chip.addEventListener("click", () => { queryInput.value = chip.dataset.query; answerQuery(chip.dataset.query); }));
  queryInput.addEventListener("keydown", (event) => { if (event.key === "Enter" && queryInput.value.trim()) answerQuery(queryInput.value.trim()); });

  const mic = $("#micButton");
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (SpeechRecognition) {
    const recognition = new SpeechRecognition();
    recognition.interimResults = false; recognition.maxAlternatives = 1;
    recognition.onstart = () => { mic.classList.add("listening"); toast("Listening for field query…"); };
    recognition.onend = () => mic.classList.remove("listening");
    recognition.onresult = (event) => { const transcript = event.results[0][0].transcript; queryInput.value = transcript; answerQuery(transcript); };
    recognition.onerror = () => { mic.classList.remove("listening"); toast("Voice capture unavailable · use text query"); };
    mic.addEventListener("click", () => { recognition.lang = state.language === "hi" ? "hi-IN" : "en-IN"; recognition.start(); });
  } else {
    mic.addEventListener("click", () => { queryInput.focus(); toast("Voice API unavailable · text query is ready"); });
  }
  $("#voiceFocusButton").addEventListener("click", () => { $("#voiceQuery").focus(); $("#voiceQuery").scrollIntoView({ behavior: "smooth", block: "center" }); });

  $("#languageToggle").addEventListener("click", () => {
    state.language = state.language === "en" ? "hi" : "en";
    $$(`[data-${state.language}]`).forEach((node) => { node.textContent = node.dataset[state.language]; });
    document.documentElement.lang = state.language === "hi" ? "hi" : "en";
    toast(state.language === "hi" ? "हिंदी इंटरफेस सक्रिय" : "English interface active");
  });

  $$(".nav-item").forEach((item) => item.addEventListener("click", () => {
    $$(".nav-item").forEach((nav) => nav.classList.remove("active")); item.classList.add("active");
  }));
  $$(".map-tab").forEach((tab) => tab.addEventListener("click", () => { $$(".map-tab").forEach((other) => other.classList.remove("active")); tab.classList.add("active"); toast(`${tab.textContent[0] + tab.textContent.slice(1).toLowerCase()} layer selected`); }));

  updateForecast();
})();
