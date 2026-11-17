// End-to-end run of the invitation on a phone-sized touch screen.
// Usage: node tests/e2e.mjs
import { createRequire } from "node:module";
import { spawn } from "node:child_process";
import assert from "node:assert/strict";
import path from "node:path";
import { fileURLToPath } from "node:url";

// The browser driver is installed globally, which only require() can see.
const { chromium } = createRequire(import.meta.url)("playwright");

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const PORT = 4173 + Math.floor(Math.random() * 500);
const URL = `http://127.0.0.1:${PORT}/index.html`;

const server = spawn("python3", ["-m", "http.server", String(PORT), "--bind", "127.0.0.1"], {
  cwd: root, stdio: "ignore",
});
const browser = await chromium.launch();
let failures = 0;

async function check(name, fn) {
  try {
    await fn();
    console.log(`ok   ${name}`);
  } catch (err) {
    failures++;
    console.log(`FAIL ${name}\n     ${String(err.message).split("\n").join("\n     ")}`);
  }
}

async function waitForServer() {
  for (let i = 0; i < 50; i++) {
    try { if ((await fetch(URL)).status) return; } catch {}
    await new Promise((r) => setTimeout(r, 100));
  }
  throw new Error("static server did not start");
}

// mode: "ok" | "fail" | "slow"; returns the list of submitted bodies
async function open({ width = 390, height = 844, mode = { value: "ok" } } = {}) {
  const context = await browser.newContext({
    viewport: { width, height }, hasTouch: true, isMobile: true,
  });
  const page = await context.newPage();
  page.setDefaultTimeout(5000);
  page.on("pageerror", (e) => console.log(`     page error: ${e.message}`));
  const sent = [];
  await page.route("**/fonts.googleapis.com/**", (r) => r.abort());
  await page.route("**/fonts.gstatic.com/**", (r) => r.abort());
  await page.route("**/api.web3forms.com/**", async (route) => {
    sent.push(route.request().postDataJSON());
    if (mode.value === "fail") return route.abort();
    if (mode.value === "refuse") {
      return route.fulfill({ status: 200, contentType: "application/json", body: '{"success":false}' });
    }
    if (mode.value === "slow") await new Promise((r) => setTimeout(r, 400));
    return route.fulfill({ status: 200, contentType: "application/json", body: '{"success":true}' });
  });
  await page.goto(URL, { waitUntil: "domcontentloaded" });
  await page.waitForSelector('[data-step="ask"]:not([hidden])');
  return { page, sent, mode, close: () => context.close() };
}

const visibleStep = (page) =>
  page.evaluate(() =>
    [...document.querySelectorAll("[data-step]")].filter((s) => !s.hidden).map((s) => s.dataset.step).join(","));

const box = (page, sel) =>
  page.evaluate((s) => {
    const r = document.querySelector(s).getBoundingClientRect();
    return { x: r.x, y: r.y, w: r.width, h: r.height };
  }, sel);

const overlaps = (a, b) =>
  a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;

async function tapCentre(page, sel) {
  await page.locator(sel).scrollIntoViewIfNeeded();
  const b = await box(page, sel);
  await page.touchscreen.tap(b.x + b.w / 2, b.y + b.h / 2);
  await page.waitForTimeout(450); // let the glide finish
}

async function assertNoIsOnScreenAndOffJom(page) {
  const vp = page.viewportSize();
  const no = await box(page, "#no");
  const jom = await box(page, "#jom");
  assert.ok(no.x >= 0 && no.y >= 0 && no.x + no.w <= vp.width && no.y + no.h <= vp.height,
    `no is off screen: ${JSON.stringify(no)} in ${vp.width}x${vp.height}`);
  assert.ok(!overlaps(no, jom), `no overlaps jommmm: ${JSON.stringify(no)} vs ${JSON.stringify(jom)}`);
}

async function walkToNote(page) {
  await page.click("#jom");
  await page.click('button[data-mood="gallery"]');
  await page.click('button[data-mood="coffee"]');
  await page.click('[data-step="mood"] [data-next]');
  await page.click('button[data-date="2026-12-06"]');
  await page.click('[data-step="dates"] [data-next]');
  await page.waitForSelector('[data-step="note"]:not([hidden])');
}

await waitForServer();

await check("the ask shows Haziq's words exactly, signed", async () => {
  const { page, close } = await open();
  const text = await page.innerText('[data-step="ask"]');
  for (const line of [
    "Hi hanna 🌷",
    "I've been waiting to take you out properly for a while now.",
    "no rush , no pressure. Just tell me what you're in the mood for, and i akan plan the rest.",
    "Hanna, May i ask you outt 😬",
    "— haziq",
  ]) assert.ok(text.includes(line), `missing: ${line}\n--- got ---\n${text}`);
  assert.equal((await page.innerText("#no")).trim(), "no");
  assert.equal((await page.innerText("#jom")).trim(), "jommmm");
  await close();
});

for (const [width, height] of [[390, 844], [320, 568]]) {
  await check(`tapping no at ${width}x${height} only makes it run away`, async () => {
    const { page, close } = await open({ width, height });
    const jomBefore = await box(page, "#jom");
    for (let i = 0; i < 6; i++) {
      await tapCentre(page, "#no");
      assert.equal(await visibleStep(page), "ask");
      await assertNoIsOnScreenAndOffJom(page);
    }
    assert.equal((await page.innerText("#no")).trim(), "okay okay… jommmm je la");
    const jomAfter = await box(page, "#jom");
    assert.ok(jomAfter.w > jomBefore.w, "jommmm should have grown");
    assert.ok(jomAfter.x >= 0 && jomAfter.x + jomAfter.w <= width, "jommmm grew off screen");
    await close();
  });
}

await check("no cannot be pressed from the keyboard or by script click", async () => {
  const { page, close } = await open();
  await page.focus("#no");
  await page.keyboard.press("Enter");
  await page.keyboard.press("Space");
  await page.evaluate(() => document.querySelector("#no").click());
  await page.waitForTimeout(450);
  assert.equal(await visibleStep(page), "ask");
  await assertNoIsOnScreenAndOffJom(page);
  await close();
});

await check("jommmm leads to the mood step, which needs one pick", async () => {
  const { page, close } = await open();
  await page.click("#jom");
  assert.equal(await visibleStep(page), "mood");
  assert.ok((await page.innerText('[data-step="mood"]')).includes("yayy! jadi what are you in the mood for ?"));
  assert.equal(await page.isVisible("#no"), false, "no should be gone after the ask");
  assert.equal(await page.locator("button[data-mood]").count(), 7);
  const moodText = await page.innerText("#moods");
  for (const name of ["coffee", "brunch", "art gallery", "museum", "lunch", "dinner", "full day"]) {
    assert.ok(moodText.includes(name), `missing mood ${name}`);
  }
  const inVase = (id) => page.evaluate((f) => document.querySelector(`#vase [data-flower="${f}"]`).classList.contains("is-in"), id);
  assert.equal(await inVase("museum"), false, "vase starts without her flowers");
  assert.equal(await page.isDisabled('[data-step="mood"] [data-next]'), true);
  await page.click('button[data-mood="museum"]');
  assert.equal(await page.getAttribute('button[data-mood="museum"]', "aria-pressed"), "true");
  assert.equal(await page.isDisabled('[data-step="mood"] [data-next]'), false);
  assert.equal(await inVase("museum"), true, "picking a mood adds its flower");
  await page.click('button[data-mood="museum"]');
  assert.equal(await inVase("museum"), false, "unpicking takes the flower out");
  await page.click('button[data-mood="fullday"]');
  for (const id of ["coffee", "brunch", "gallery", "museum", "lunch", "dinner"]) {
    assert.equal(await inVase(id), true, `full day should put ${id}'s flower in`);
  }
  assert.equal(await page.isDisabled('[data-step="mood"] [data-next]'), false);
  await page.click('button[data-mood="fullday"]');
  assert.equal(await inVase("coffee"), false, "taking full day back empties the vase");
  assert.equal(await page.isDisabled('[data-step="mood"] [data-next]'), true);
  await close();
});

await check("dates step offers eight dates and her own date", async () => {
  const { page, close } = await open();
  await page.click("#jom");
  await page.click('button[data-mood="dinner"]');
  await page.click('[data-step="mood"] [data-next]');
  assert.equal(await visibleStep(page), "dates");
  assert.ok((await page.innerText('[data-step="dates"]')).includes("bila free?"));
  assert.equal(await page.locator("button[data-date]").count(), 10);
  assert.ok((await page.innerText("#own-date-toggle")).includes("none of these, but i choose the date"));
  assert.equal(await page.isVisible("#own-date"), false);
  assert.equal(await page.isDisabled('[data-step="dates"] [data-next]'), true);
  assert.equal((await page.innerText("#ticket-mood")).trim(), "dinner");
  assert.equal(await page.isVisible("#stamp"), false, "no stamp before a day is picked");
  await page.click('button[data-date="2026-12-06"]');
  assert.equal(await page.isVisible("#stamp"), true);
  assert.ok((await page.innerText("#stamp")).includes("6 DEC"));
  await page.click('button[data-date="2026-12-06"]');
  assert.equal(await page.isVisible("#stamp"), false);

  await page.click("#own-date-toggle");
  assert.equal(await page.isVisible("#own-date"), true);
  assert.equal(await page.isDisabled('[data-step="dates"] [data-next]'), true, "toggle alone is not an answer");
  const today = await page.evaluate(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  });
  assert.equal(await page.getAttribute("#own-date", "min"), today);
  await page.fill("#own-date-text", "lepas new year");
  assert.equal(await page.isDisabled('[data-step="dates"] [data-next]'), false);
  await close();
});

await check("a failed send keeps her answers and retry gets it through", async () => {
  const mode = { value: "fail" };
  const { page, sent, close } = await open({ mode });
  await walkToNote(page);
  await page.fill("#note", "no spicy food pls");
  await page.click("#send");
  await page.waitForSelector("#error:not([hidden])");
  assert.equal(await visibleStep(page), "note");
  assert.equal(await page.inputValue("#note"), "no spicy food pls");
  assert.ok((await page.getAttribute("#error a", "href")).includes("instagram.com/zimekq"));

  mode.value = "refuse";
  await page.click("#retry");
  await page.waitForFunction(() => !document.querySelector("#retry").disabled);
  assert.equal(await visibleStep(page), "note", "a refused send is still a failure");

  mode.value = "ok";
  await page.click("#retry");
  await page.waitForSelector('[data-step="done"]:not([hidden])');
  assert.equal(sent.length, 3);
  await close();
});

await check("send goes out once with her picks and lands on the thank-you", async () => {
  const { page, sent, close } = await open({ mode: { value: "slow" } });
  await walkToNote(page);
  await page.fill("#note", "hehe okay");
  await page.evaluate(() => {
    const send = document.querySelector("#send");
    send.click();
    send.click();
  });
  await page.waitForSelector('[data-step="done"]:not([hidden])');
  assert.equal(sent.length, 1, "double tap must send one email");
  const body = sent[0];
  assert.equal(body.access_key, "a6b6a219-7cf3-4d7a-92f4-c18de8063c1a");
  assert.equal(body.subject, "Hanna said jommmm 🌷");
  assert.equal(body.mood, "☕ coffee, 🎨 art gallery");
  assert.equal(body.dates, "sun 6 dec");
  assert.equal(body.note, "hehe okay");
  assert.ok((await page.innerText('[data-step="done"]')).includes("okieee. rest easy, i akan settlekan semua 🌷"));
  assert.equal(await page.getAttribute("a#ig", "href"), "https://instagram.com/zimekq");
  const bouquet = await page.evaluate(() =>
    [...document.querySelectorAll("#bouquet [data-flower].is-in")].map((g) => g.dataset.flower).sort().join(","));
  assert.equal(bouquet, "coffee,gallery", "the bouquet holds exactly the flowers she picked");
  assert.equal((await page.innerText("#recap")).trim(), "coffee · art gallery · sun 6 dec");
  await close();
});

await check("nothing is sent before she taps send", async () => {
  const { page, sent, close } = await open();
  await tapCentre(page, "#no");
  await walkToNote(page);
  assert.equal(sent.length, 0);
  await close();
});

await check("no step scrolls sideways on a small phone", async () => {
  const { page, close } = await open({ width: 320, height: 568 });
  const wide = async () => page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
  assert.equal(await wide(), false, "ask");
  await page.click("#jom");
  assert.equal(await wide(), false, "mood");
  await page.click('button[data-mood="dinner"]');
  await page.click('[data-step="mood"] [data-next]');
  await page.click('button[data-date="2026-12-06"]');
  assert.equal(await wide(), false, "dates while the stamp lands");
  await page.click("#own-date-toggle");
  assert.equal(await wide(), false, "dates");
  await close();
});

await browser.close();
server.kill();
console.log(failures ? `\n${failures} failed` : "\nall passed");
process.exit(failures ? 1 : 0);
