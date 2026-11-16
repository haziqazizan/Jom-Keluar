// Pure decisions for the page. No DOM in here, so it can be tested with node.

export const NO_LABELS = [
  "no",
  "eh?",
  "cuba lagi",
  "tak boleh tekan la",
  "okay okay… jommmm je la",
];

export const MOODS = [
  { id: "coffee", label: "☕ coffee" },
  { id: "gallery", label: "🎨 art gallery" },
  { id: "museum", label: "🏛 museum" },
  { id: "dinner", label: "🍽 dinner" },
];

export const DATES = [
  { id: "2026-11-28", label: "sat 28 nov" },
  { id: "2026-11-29", label: "sun 29 nov" },
  { id: "2026-12-05", label: "sat 5 dec" },
  { id: "2026-12-06", label: "sun 6 dec" },
  { id: "2026-12-19", label: "sat 19 dec" },
  { id: "2026-12-20", label: "sun 20 dec" },
  { id: "2026-12-26", label: "sat 26 dec" },
  { id: "2026-12-27", label: "sun 27 dec" },
];

const NOTE_LIMIT = 1000;

export function noLabel(dodges) {
  return NO_LABELS[Math.min(Math.max(dodges, 0), NO_LABELS.length - 1)];
}

export function jomScale(dodges) {
  return Math.min(1 + 0.08 * Math.max(dodges, 0), 1.6);
}

function intersects(a, b) {
  return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
}

// Where the "no" button jumps to: a top-left corner that keeps the whole
// button on screen and off the "jommmm" button.
export function dodgePosition({ viewport, size, avoid, margin = 12, rand = Math.random }) {
  const maxX = Math.max(margin, viewport.w - size.w - margin);
  const maxY = Math.max(margin, viewport.h - size.h - margin);
  for (let i = 0; i < 50; i++) {
    const p = {
      x: margin + rand() * (maxX - margin),
      y: margin + rand() * (maxY - margin),
    };
    if (!intersects({ ...p, ...size }, avoid)) return p;
  }
  // Out of luck: take the screen corner farthest from "jommmm".
  const cx = avoid.x + avoid.w / 2;
  const cy = avoid.y + avoid.h / 2;
  return {
    x: cx < viewport.w / 2 ? maxX : margin,
    y: cy < viewport.h / 2 ? maxY : margin,
  };
}

function ownDateParts(state) {
  if (!state.ownDate) return [];
  return [state.ownDateValue, state.ownDateText.trim()].filter(Boolean);
}

export function canContinue(step, state) {
  if (step === "mood") return state.moods.size > 0;
  if (step === "dates") return state.dates.size > 0 || ownDateParts(state).length > 0;
  return true;
}

const labelsOf = (list, chosen) =>
  list.filter((item) => chosen.has(item.id)).map((item) => item.label).join(", ");

export function buildPayload(state, accessKey) {
  return {
    access_key: accessKey,
    subject: "Hanna said jommmm 🌷",
    from_name: "Jom Keluar",
    mood: labelsOf(MOODS, state.moods) || "-",
    dates: labelsOf(DATES, state.dates) || "-",
    her_own_date: ownDateParts(state).join(", ") || "-",
    note: state.note.trim().slice(0, NOTE_LIMIT) || "-",
  };
}
