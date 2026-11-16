import {
  MOODS, DATES, noLabel, jomScale, dodgePosition, canContinue, buildPayload,
  stampText, moodNames, recap,
} from "./logic.js";

// Web3Forms access key. It is a public key by design: it can only deliver
// form answers to the inbox it was created for.
const WEB3FORMS_KEY = "a6b6a219-7cf3-4d7a-92f4-c18de8063c1a";
const SUBMIT_URL = "https://api.web3forms.com/submit";

const STEPS = ["ask", "mood", "dates", "note", "done"];
const MAX_JOM_SCALE = 1.6;

const $ = (sel) => document.querySelector(sel);

const state = {
  moods: new Set(),
  dates: new Set(),
  ownDate: false,
  ownDateValue: "",
  ownDateText: "",
  note: "",
};

/* ---------- steps ---------- */

let current = "ask";

function show(step) {
  current = step;
  for (const section of document.querySelectorAll("[data-step]")) {
    section.hidden = section.dataset.step !== step;
  }
  const at = STEPS.indexOf(step);
  for (const dot of document.querySelectorAll("[data-dot]")) {
    const i = STEPS.indexOf(dot.dataset.dot);
    dot.classList.toggle("is-done", i < at);
    dot.classList.toggle("is-current", i === at);
  }
  noBtn.hidden = step !== "ask";
  if (step === "dates") $("#ticket-mood").textContent = moodNames(state).join(", ");
  if (step === "done") arrangeBouquet();
  window.scrollTo(0, 0);
  const heading = $(`[data-step="${step}"] h2`);
  if (heading) heading.focus({ preventScroll: true });
}

function refreshNext() {
  for (const step of ["mood", "dates"]) {
    $(`[data-step="${step}"] [data-next]`).disabled = !canContinue(step, state);
  }
  refreshStamp();
}

// the rubber stamp lands on the ticket once she has picked a day
function refreshStamp() {
  const text = stampText(state);
  const stamp = $("#stamp");
  const key = text ? `${text.big}|${text.small}` : "";
  if (stamp.dataset.key === key) return;
  stamp.dataset.key = key;
  stamp.hidden = true;
  if (!text) return;
  $("#stamp-top").textContent = text.top;
  $("#stamp-big").textContent = text.big;
  $("#stamp-small").textContent = text.small;
  stamp.offsetWidth; // restart the stamping animation
  stamp.hidden = false;
}

// the thank-you shows the vase exactly as she filled it
function arrangeBouquet() {
  const copy = $("#vase").cloneNode(true);
  copy.removeAttribute("id");
  copy.setAttribute("aria-label", "the bouquet you arranged");
  $("#bouquet").replaceChildren(copy);
  $("#recap").textContent = recap(state);
}

for (const btn of document.querySelectorAll("[data-next]")) {
  btn.addEventListener("click", () => {
    if (canContinue(current, state)) show(btn.dataset.next);
  });
}
for (const btn of document.querySelectorAll("[data-back]")) {
  btn.addEventListener("click", () => show(btn.dataset.back));
}

/* ---------- the no button that cannot be pressed ---------- */

const noBtn = $("#no");
const noSlot = $("#no-slot");
const jomBtn = $("#jom");
let dodges = 0;
let lastDodge = 0;

function viewport() {
  const vv = window.visualViewport;
  return { w: Math.floor(vv ? vv.width : window.innerWidth), h: Math.floor(vv ? vv.height : window.innerHeight) };
}

// The space "jommmm" may ever occupy, so "no" never lands where it will grow.
function jomZone() {
  const r = jomBtn.getBoundingClientRect();
  const w = jomBtn.offsetWidth * MAX_JOM_SCALE + 16;
  const h = jomBtn.offsetHeight * MAX_JOM_SCALE + 16;
  return { x: r.left + r.width / 2 - w / 2, y: r.top + r.height / 2 - h / 2, w, h };
}

function placeNo() {
  const p = dodgePosition({
    viewport: viewport(),
    size: { w: noBtn.offsetWidth, h: noBtn.offsetHeight },
    avoid: jomZone(),
  });
  noBtn.style.left = `${Math.round(p.x)}px`;
  noBtn.style.top = `${Math.round(p.y)}px`;
}

function dodge() {
  const now = performance.now();
  // one tap fires several events (touchstart, pointerdown, click); count it once
  if (now - lastDodge < 250) return;
  lastDodge = now;
  dodges += 1;

  if (!noBtn.classList.contains("is-running")) {
    // lift it out of the card so it can roam the whole screen
    const r = noBtn.getBoundingClientRect();
    noBtn.style.left = `${r.left}px`;
    noBtn.style.top = `${r.top}px`;
    noBtn.classList.add("is-running");
    document.body.appendChild(noBtn);
    noSlot.hidden = true;
    noBtn.getBoundingClientRect(); // settle the start point so it glides from there
  }

  noBtn.textContent = noLabel(dodges);
  jomBtn.style.setProperty("--jom-scale", jomScale(dodges));
  placeNo();
}

function refuse(event) {
  event.preventDefault();
  event.stopPropagation();
  dodge();
}

noBtn.addEventListener("touchstart", refuse, { passive: false });
noBtn.addEventListener("pointerdown", refuse);
noBtn.addEventListener("mousedown", refuse);
noBtn.addEventListener("click", refuse);
noBtn.addEventListener("pointerenter", () => dodge());
noBtn.addEventListener("focus", () => dodge());
noBtn.addEventListener("keydown", (event) => {
  if (event.key === "Enter" || event.key === " ") refuse(event);
});

// with a mouse, run before the cursor even arrives
document.addEventListener("pointermove", (event) => {
  if (event.pointerType !== "mouse" || noBtn.hidden) return;
  const r = noBtn.getBoundingClientRect();
  const near = 46;
  if (event.clientX > r.left - near && event.clientX < r.right + near &&
      event.clientY > r.top - near && event.clientY < r.bottom + near) {
    dodge();
  }
});

// keep it on screen when the phone rotates or the window resizes
window.addEventListener("resize", () => {
  if (noBtn.classList.contains("is-running") && !noBtn.hidden) placeNo();
});

jomBtn.addEventListener("click", () => show("mood"));

/* ---------- mood ---------- */

function toggleChip(chip, set, id) {
  const on = !set.has(id);
  if (on) set.add(id); else set.delete(id);
  chip.setAttribute("aria-pressed", String(on));
  refreshNext();
}

const SVG_NS = "http://www.w3.org/2000/svg";

// a flower is in the vase if she picked it, or if she picked the full day
function refreshVase() {
  const everything = MOODS.some((m) => m.whole && state.moods.has(m.id));
  for (const mood of MOODS) {
    if (mood.whole) continue;
    const on = everything || state.moods.has(mood.id);
    $(`#vase [data-flower="${mood.id}"]`).classList.toggle("is-in", on);
    $(`#vase [data-ghost="${mood.id}"]`).classList.toggle("is-filled", on);
  }
}

const moodsEl = $("#moods");
for (const mood of MOODS) {
  const chip = document.createElement("button");
  chip.type = "button";
  chip.className = mood.whole ? "chip chip-whole" : "chip";
  chip.dataset.mood = mood.id;
  chip.setAttribute("aria-pressed", "false");

  const icon = document.createElementNS(SVG_NS, "svg");
  icon.setAttribute("class", "mood-flower");
  icon.setAttribute("viewBox", "0 0 40 40");
  icon.setAttribute("aria-hidden", "true");
  const use = document.createElementNS(SVG_NS, "use");
  use.setAttribute("href", `#${mood.flower}`);
  use.setAttribute("width", "40");
  use.setAttribute("height", "40");
  icon.appendChild(use);

  const words = document.createElement("span");
  const name = document.createElement("span");
  name.className = "mood-name";
  name.textContent = mood.name;
  const what = document.createElement("span");
  what.className = "mood-what";
  what.textContent = mood.flowerName;
  words.append(name, what);

  chip.append(icon, words);
  chip.addEventListener("click", () => {
    toggleChip(chip, state.moods, mood.id);
    refreshVase();
  });
  moodsEl.appendChild(chip);
}

/* ---------- dates ---------- */

const datesEl = $("#dates");
for (const date of DATES) {
  const [dow, day, mon] = date.label.split(" ");
  const chip = document.createElement("button");
  chip.type = "button";
  chip.className = "chip";
  chip.dataset.date = date.id;
  chip.setAttribute("aria-pressed", "false");
  chip.setAttribute("aria-label", date.label);
  chip.innerHTML = `<span class="date-dow"></span><span class="date-day"></span><span class="date-mon"></span>`;
  chip.children[0].textContent = dow;
  chip.children[1].textContent = day;
  chip.children[2].textContent = mon;
  chip.addEventListener("click", () => toggleChip(chip, state.dates, date.id));
  datesEl.appendChild(chip);
}

const ownToggle = $("#own-date-toggle");
const ownBox = $("#own-date-box");
const ownDate = $("#own-date");
const ownText = $("#own-date-text");

function todayLocal() {
  const d = new Date();
  const pad = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}
ownDate.min = todayLocal();

ownToggle.addEventListener("click", () => {
  state.ownDate = !state.ownDate;
  ownToggle.setAttribute("aria-pressed", String(state.ownDate));
  ownBox.hidden = !state.ownDate;
  refreshNext();
});
ownDate.addEventListener("input", () => {
  // typed dates can slip under the picker's minimum; a day already gone is not an answer
  state.ownDateValue = ownDate.value && ownDate.value >= ownDate.min ? ownDate.value : "";
  refreshNext();
});
ownText.addEventListener("input", () => {
  state.ownDateText = ownText.value;
  refreshNext();
});

/* ---------- note and send ---------- */

const noteEl = $("#note");
const sendBtn = $("#send");
const retryBtn = $("#retry");
const errorEl = $("#error");
let sending = false;

noteEl.addEventListener("input", () => { state.note = noteEl.value; });

async function send() {
  if (sending) return;
  sending = true;
  state.note = noteEl.value;
  errorEl.hidden = true;
  sendBtn.disabled = true;
  retryBtn.disabled = true;
  const sendLabel = sendBtn.textContent;
  sendBtn.textContent = "sending…";

  let delivered = false;
  try {
    const response = await fetch(SUBMIT_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify(buildPayload(state, WEB3FORMS_KEY)),
    });
    const result = await response.json();
    delivered = response.ok && result.success === true;
  } catch {
    delivered = false;
  }

  sending = false;
  sendBtn.disabled = false;
  retryBtn.disabled = false;
  sendBtn.textContent = sendLabel;

  if (delivered) {
    show("done");
  } else {
    errorEl.hidden = false;
    errorEl.scrollIntoView({ block: "nearest" });
  }
}

sendBtn.addEventListener("click", send);
retryBtn.addEventListener("click", send);

/* ---------- go ---------- */

refreshNext();
show("ask");
