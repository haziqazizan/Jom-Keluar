# Jom Keluar Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A one-page, phone-first invitation where Hanna says jommmm, picks moods and dates, and her answer is emailed to Haziq.

**Architecture:** Static site at the repo root with no build step. Pure decision logic lives in `logic.js` (an ES module, unit tested with Node's built-in runner); `app.js` wires it to the DOM; `styles.css` and inline SVG carry the look. Submission is a single `fetch` to Web3Forms.

**Tech Stack:** HTML, CSS, vanilla JS (ES modules), Google Fonts, `node --test`, the pre-installed Playwright for the end-to-end check, GitHub Pages.

**Spec:** `docs/superpowers/specs/2026-11-16-jom-keluar-design.md`. Read it first; the copy and the Look section are binding.

## Global Constraints

- All user-facing copy is exactly as written in the spec, including spelling, spacing and capitalisation ("Hanna, May i ask you outt 😬", "yayy! jadi what are you in the mood for ?", "okieee. rest easy, i akan settlekan semua 🌷").
- No photographs, no images of Hanna, no mention of her Instagram or YouTube handles anywhere in the repo.
- No frameworks, no bundler, no npm dependencies. Scripts allowed only from the page itself; fonts from Google Fonts.
- Nothing is sent anywhere until she taps `send`. No analytics.
- `no` must be impossible to activate by pointer, touch or keyboard.
- Phone first: must work at 320 px wide and in touch-only browsers (Instagram in-app browser). Honour `prefers-reduced-motion`.
- Instagram button target: `https://instagram.com/zimekq`.

## Review Focus

- Touch-only device: tapping `no` directly makes it jump before any click registers; it never ends up under `jommmm` or outside the visible screen at 320×568.
- Keyboard: tabbing to `no` and pressing Enter or Space does nothing but dodge.
- Double tap on `send`: exactly one request goes out.
- Network failure or `success: false` from Web3Forms: answers stay on screen, a kind error shows, retry works, Instagram button is offered.
- Own-date picker: past dates cannot be chosen; choosing "none of these" with no date and no text does not let her continue.

## File Structure

- `index.html`: the five step sections, inline SVG florals, font links.
- `styles.css`: palette, texture, type, card, chips, stamp frame, motion.
- `logic.js`: pure functions, no DOM access.
- `app.js`: state, event wiring, step navigation, submit.
- `tests/logic.test.mjs`: unit tests.
- `tests/e2e.mjs`: Playwright script against a local static server.
- `README.md`: how to add the Web3Forms key and turn on GitHub Pages.

---

### Task 1: Decision logic

**Files:**
- Create: `logic.js`, `tests/logic.test.mjs`

**Interfaces (produced, used by Task 2):**

```js
export const NO_LABELS   // ["no","eh?","cuba lagi","tak boleh tekan la","okay okay… jommmm je la"]
export const MOODS       // [{id:"coffee",label:"☕ coffee"},{id:"gallery",label:"🎨 art gallery"},{id:"museum",label:"🏛 museum"},{id:"dinner",label:"🍽 dinner"}]
export const DATES       // [{id:"2026-11-28",label:"sat 28 nov"}, … 29 nov, 5/6/19/20/26/27 dec]
export function noLabel(dodges)        // string; index clamps at the last label
export function jomScale(dodges)       // 1 + 0.08*dodges, capped at 1.6
export function dodgePosition({viewport:{w,h}, size:{w,h}, avoid:{x,y,w,h}, margin=12, rand=Math.random})
                                        // -> {x,y} top-left, fully inside viewport minus margin, not intersecting avoid
export function canContinue(step, state) // step "mood" | "dates"
export function buildPayload(state, accessKey) // object for Web3Forms
// state: {moods:Set<string>, dates:Set<string>, ownDate:boolean, ownDateValue:string, ownDateText:string, note:string}
```

- [ ] **Step 1: Write failing tests** in `tests/logic.test.mjs` using `node:test` and `node:assert/strict`:
  - `noLabel(0)==="no"`, `noLabel(1)==="eh?"`, `noLabel(4)===noLabel(99)==="okay okay… jommmm je la"`.
  - `jomScale(0)===1`, `jomScale(100)===1.6`.
  - `DATES.map(d=>d.id)` equals the eight ISO dates in the spec, in order.
  - `dodgePosition`: for 500 seeded random draws at viewport 320×568, size 90×44, avoid `{x:160,y:400,w:140,h:52}`: result always within `[12, w-size.w-12]` × `[12, h-size.h-12]` and never intersects `avoid`.
  - `canContinue("mood", …)` false with empty moods, true with one.
  - `canContinue("dates", …)`: true with one date; with `ownDate` true and no dates it is true only if `ownDateValue` or trimmed `ownDateText` is non-empty.
  - `buildPayload`: has `access_key`, `subject: "Hanna said jommmm 🌷"`, `from_name: "Jom Keluar"`, `mood` as comma-joined labels, `dates` as comma-joined labels, `her_own_date` combining value and text (or "-"), `note` (or "-"); note is trimmed and cut to 1000 characters.
- [ ] **Step 2:** Run `node --test tests/`. Expected: fails, module not found.
- [ ] **Step 3:** Implement `logic.js`. `dodgePosition` uses rejection sampling with `rand`, up to 50 tries, then falls back to the viewport corner farthest from `avoid`.
- [ ] **Step 4:** Run `node --test tests/`. Expected: all pass.
- [ ] **Step 5:** Commit.

### Task 2: The page

**Files:**
- Create: `index.html`, `styles.css`, `app.js`, `tests/e2e.mjs`

**Interfaces:** consumes everything exported by `logic.js`. `app.js` holds `const WEB3FORMS_KEY = "YOUR_WEB3FORMS_KEY"` at the top and posts JSON to `https://api.web3forms.com/submit`.

Hooks the test relies on: sections `[data-step="ask|mood|dates|note|done"]` with only the current one visible; `#no`, `#jom`, `#send`, `#retry`, `#note`, `#own-date-toggle`, `#own-date`, `#own-date-text`, `#error`; chips are `button[data-mood]` and `button[data-date]` with `aria-pressed`; next buttons `[data-next]` are `disabled` until `canContinue`; `a#ig` with the Instagram href.

- [ ] **Step 1: Write the failing end-to-end script** `tests/e2e.mjs`: start `python3 -m http.server` on a free port, launch Chromium with a 390×844 touch context (`hasTouch: true, isMobile: true`), route `**/api.web3forms.com/**` and record requests. Assert:
  - Ask screen shows the spec copy verbatim and "— haziq".
  - Tapping `#no` five times never changes the visible step; label ends at "okay okay… jommmm je la"; after each tap `#no`'s box is inside the viewport and does not overlap `#jom`. Repeat the bounds check at 320×568.
  - Focusing `#no` and pressing Enter keeps the ask step visible.
  - `#jom` → mood step with the exact heading; next disabled until a chip is pressed.
  - Dates step lists eight chips; "none of these, but i choose the date" reveals `#own-date` whose `min` is today; next disabled until a date or own date is given.
  - With the route fulfilling `{success:true}`: double-tap `#send` → exactly one request, body contains chosen mood and date labels and the key; done step shows the exact closing line and `a#ig` href.
  - With the route aborting: `#error` visible, note text preserved, `#retry` then succeeds after the route is switched to success.
- [ ] **Step 2:** Run `node tests/e2e.mjs`. Expected: fails, no page.
- [ ] **Step 3: Build `index.html`, `styles.css`, `app.js`.** Follow the spec's Look section closely: cream linen base with paper grain, blush, sage, a touch of strawberry red, warm brown text; serif message, handwritten script headings; one centred card per step; stamp-frame and washi-tape details; SVG flowers; chips as paper tags; story-circle step dots; slow drifting petals. `no` dodges on `pointerenter`, `pointerdown`, `touchstart` (with `preventDefault`), `focus` and `click` (prevented); it becomes `position: fixed` on first dodge and is placed with `dodgePosition` using `#jom`'s rect as `avoid`; re-clamp on resize. `send` is disabled while a request is in flight.
- [ ] **Step 4:** Run `node tests/e2e.mjs` and `node --test tests/`. Expected: all pass.
- [ ] **Step 5: Look check.** Screenshot each step at 390×844 and the ask step at 320×568 and 1280×800 into the scratchpad, view them, and fix anything that does not read as her feed (cluttered, harsh colour, cramped text, clipped flowers).
- [ ] **Step 6:** Commit.

### Task 3: Go-live instructions

**Files:**
- Modify: `README.md`

- [ ] **Step 1:** Write the README: what the page is in two lines; how to get a Web3Forms access key and where to paste it (`WEB3FORMS_KEY` in `app.js`); how to turn on GitHub Pages (Settings → Pages → deploy from branch, root); a reminder to send yourself a test answer before sharing the link; how to run the tests.
- [ ] **Step 2:** Commit and push.
