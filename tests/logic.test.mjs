import test from "node:test";
import assert from "node:assert/strict";
import {
  NO_LABELS, MOODS, DATES,
  noLabel, jomScale, dodgePosition, canContinue, buildPayload, stampText, recap,
} from "../logic.js";

const emptyState = () => ({
  moods: new Set(), dates: new Set(),
  ownDate: false, ownDateValue: "", ownDateText: "", note: "",
});

// small deterministic generator so a failure can be reproduced
function seeded(seed) {
  let s = seed;
  return () => {
    s = (s * 1664525 + 1013904223) % 4294967296;
    return s / 4294967296;
  };
}

const intersects = (a, b) =>
  a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;

test("no label starts as 'no' and walks through the teasing lines", () => {
  assert.equal(noLabel(0), "no");
  assert.equal(noLabel(1), "eh?");
  assert.equal(noLabel(2), "cuba lagi");
  assert.equal(noLabel(3), "tak boleh tekan la");
  assert.equal(noLabel(4), "okay okay… jommmm je la");
  assert.equal(NO_LABELS.length, 5);
});

test("no label stays on the last line however many times she tries", () => {
  assert.equal(noLabel(99), "okay okay… jommmm je la");
});

test("jommmm grows with each dodge and stops at 1.6", () => {
  assert.equal(jomScale(0), 1);
  assert.ok(jomScale(2) > jomScale(1));
  assert.equal(jomScale(100), 1.6);
});

test("the offered dates are the ten weekend days Haziq is free", () => {
  assert.deepEqual(DATES.map((d) => d.id), [
    "2026-11-21", "2026-11-22", "2026-11-28", "2026-11-29", "2026-12-05", "2026-12-06",
    "2026-12-19", "2026-12-20", "2026-12-26", "2026-12-27",
  ]);
  assert.equal(DATES[0].label, "sat 21 nov");
  assert.equal(DATES[1].label, "sun 22 nov");
  assert.equal(DATES[9].label, "sun 27 dec");
});

test("the moods are the six outings plus a full day", () => {
  assert.deepEqual(MOODS.map((m) => m.label), [
    "☕ coffee", "🥞 brunch", "🎨 art gallery", "🏛 museum", "🥗 lunch", "🍽 dinner",
    "💐 full day (you plan the rest)",
  ]);
  assert.deepEqual(MOODS.map((m) => m.name), [
    "coffee", "brunch", "art gallery", "museum", "lunch", "dinner", "full day",
  ]);
});

test("only full day stands for the whole bouquet", () => {
  assert.deepEqual(MOODS.filter((m) => m.whole).map((m) => m.id), ["fullday"]);
});

test("full day alone is enough to continue and reaches the email", () => {
  const s = emptyState();
  s.moods.add("fullday");
  s.dates.add("2026-12-06");
  assert.equal(canContinue("mood", s), true);
  assert.equal(buildPayload(s, "K").mood, "💐 full day (you plan the rest)");
  assert.equal(recap(s), "full day · sun 6 dec");
});

test("every mood has its own flower for the bouquet", () => {
  const flowers = MOODS.map((m) => m.flower);
  assert.equal(new Set(flowers).size, 7);
  for (const m of MOODS) assert.ok(m.flowerName.startsWith("a "), m.flowerName);
});

test("the ticket has no stamp until she picks a day", () => {
  assert.equal(stampText(emptyState()), null);
  const s = emptyState();
  s.ownDate = true;
  assert.equal(stampText(s), null);
});

test("one picked day is stamped with that date", () => {
  const s = emptyState();
  s.dates.add("2026-12-06");
  assert.deepEqual(stampText(s), { top: "confirmed", big: "6 DEC", small: "sunday" });
  const t = emptyState();
  t.dates.add("2026-11-28");
  assert.deepEqual(stampText(t), { top: "confirmed", big: "28 NOV", small: "saturday" });
});

test("several picked days are stamped with how many", () => {
  const s = emptyState();
  s.dates.add("2026-12-06");
  s.dates.add("2026-12-19");
  s.ownDate = true;
  s.ownDateText = "lepas new year";
  assert.deepEqual(stampText(s), { top: "confirmed", big: "3 DAYS", small: "to choose from" });
});

test("only her own date is stamped as her pick", () => {
  const s = emptyState();
  s.ownDate = true;
  s.ownDateValue = "2027-01-09";
  assert.deepEqual(stampText(s), { top: "confirmed", big: "MY PICK", small: "noted" });
});

test("the thank-you recaps what she chose", () => {
  const s = emptyState();
  s.moods.add("gallery");
  s.moods.add("coffee");
  s.dates.add("2026-12-06");
  assert.equal(recap(s), "coffee · art gallery · sun 6 dec");
  s.ownDate = true;
  s.ownDateText = " petang ";
  assert.equal(recap(s), "coffee · art gallery · sun 6 dec · petang");
});

test("a dodge always lands on screen and never on top of jommmm", () => {
  const viewport = { w: 320, h: 568 };
  const size = { w: 90, h: 44 };
  const avoid = { x: 160, y: 400, w: 140, h: 52 };
  const rand = seeded(7);
  for (let i = 0; i < 500; i++) {
    const p = dodgePosition({ viewport, size, avoid, rand });
    assert.ok(p.x >= 12 && p.x <= viewport.w - size.w - 12, `x ${p.x}`);
    assert.ok(p.y >= 12 && p.y <= viewport.h - size.h - 12, `y ${p.y}`);
    assert.ok(!intersects({ ...p, ...size }, avoid), `overlap at ${p.x},${p.y}`);
  }
});

test("a dodge still avoids jommmm when random luck runs out", () => {
  const viewport = { w: 320, h: 568 };
  const size = { w: 90, h: 44 };
  const avoid = { x: 20, y: 20, w: 140, h: 52 };
  // always proposes the top-left corner, which overlaps
  const p = dodgePosition({ viewport, size, avoid, rand: () => 0 });
  assert.ok(!intersects({ ...p, ...size }, avoid));
  assert.ok(p.x >= 12 && p.x <= viewport.w - size.w - 12);
  assert.ok(p.y >= 12 && p.y <= viewport.h - size.h - 12);
});

test("she cannot leave the mood step without picking one", () => {
  const s = emptyState();
  assert.equal(canContinue("mood", s), false);
  s.moods.add("coffee");
  assert.equal(canContinue("mood", s), true);
});

test("she cannot leave the dates step with nothing chosen", () => {
  assert.equal(canContinue("dates", emptyState()), false);
});

test("one offered date is enough to continue", () => {
  const s = emptyState();
  s.dates.add("2026-12-05");
  assert.equal(canContinue("dates", s), true);
});

test("'none of these' alone is not enough, she has to name a date", () => {
  const s = emptyState();
  s.ownDate = true;
  assert.equal(canContinue("dates", s), false);
  s.ownDateText = "   ";
  assert.equal(canContinue("dates", s), false);
});

test("'none of these' with a picked date or a written one continues", () => {
  const a = emptyState();
  a.ownDate = true;
  a.ownDateValue = "2027-01-09";
  assert.equal(canContinue("dates", a), true);
  const b = emptyState();
  b.ownDate = true;
  b.ownDateText = "lepas new year";
  assert.equal(canContinue("dates", b), true);
});

test("the email carries her moods, dates, own date and note", () => {
  const s = emptyState();
  s.moods.add("gallery");
  s.moods.add("coffee");
  s.dates.add("2026-12-06");
  s.ownDate = true;
  s.ownDateValue = "2027-01-09";
  s.ownDateText = "petang";
  s.note = "  no spicy food pls  ";
  const p = buildPayload(s, "KEY123");
  assert.equal(p.access_key, "KEY123");
  assert.equal(p.subject, "Hanna said jommmm 🌷");
  assert.equal(p.from_name, "Jom Keluar");
  assert.equal(p.mood, "☕ coffee, 🎨 art gallery");
  assert.equal(p.dates, "sun 6 dec");
  assert.equal(p.her_own_date, "2027-01-09, petang");
  assert.equal(p.note, "no spicy food pls");
});

test("empty parts of the email read as a dash, not blank", () => {
  const s = emptyState();
  s.moods.add("dinner");
  s.dates.add("2026-11-28");
  const p = buildPayload(s, "K");
  assert.equal(p.her_own_date, "-");
  assert.equal(p.note, "-");
});

test("a date she typed is ignored if she then unticks 'none of these'", () => {
  const s = emptyState();
  s.moods.add("dinner");
  s.dates.add("2026-11-28");
  s.ownDate = false;
  s.ownDateValue = "2027-01-09";
  assert.equal(buildPayload(s, "K").her_own_date, "-");
});

test("a very long note is cut to 1000 characters", () => {
  const s = emptyState();
  s.moods.add("dinner");
  s.dates.add("2026-11-28");
  s.note = "a".repeat(5000);
  assert.equal(buildPayload(s, "K").note.length, 1000);
});
