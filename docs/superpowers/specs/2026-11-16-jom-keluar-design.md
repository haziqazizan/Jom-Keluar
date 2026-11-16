# Jom Keluar: design

## Intent

Haziq wants to ask Hanna out on a first proper outing. They get along over
Instagram DMs and have tried twice to find a time, but their free weeks never
matched. The page replaces a third "bila free?" with one specific, charming
invitation that also solves the calendar problem: she picks what she is in the
mood for and which dates work, and Haziq plans everything else as a surprise.

## Goals

- She says yes, tells him what she likes, and picks at least one workable date.
- The page feels made for her: soft, floral, like something she would post.
- Answering takes under a minute on a phone, with nothing to type unless she wants to.
- Haziq receives her answer even if she closes the tab straight after sending.

## Non-goals

- No place names or itinerary on the page. The plan is a surprise.
- No accounts, database, admin page, or reuse for other people.
- No photos of her anywhere on the page.

## Anti-goals

- Feeling like pressure. The runaway No is a joke; nothing is sent to Haziq
  unless she finishes and taps send. Closing the page is a silent, valid exit.
- Looking like a generic meme template.
- Breaking on a phone opened from the Instagram in-app browser.

## Approaches

1. **One plain HTML page on GitHub Pages (chosen, Haziq left the how to the builder).**
   No framework, no build step, loads instantly, free. The repo must be public
   on a free account, so the source is readable; it holds only what the page shows.
2. Same page on Netlify or Vercel: nicer link and private repo, but another
   account to create for one page.
3. React or Next.js app: far more machinery than five screens need.

Her answer comes back by email through Web3Forms (chosen by Haziq) because
Instagram cannot open a DM with a pre-written message. Rejected: copy and
paste into a DM (three steps for her, answer lost if she drops off) and a
database with a results page (overbuilt).

## The page

Five steps on one page, one visible at a time, with a gentle transition.
Copy is fixed as written below, including spelling and capitalisation.

**1. The ask**

> Hi hanna 🌷
> I've been waiting to take you out properly for a while now.
> no rush , no pressure. Just tell me what you're in the mood for, and i akan plan the rest.
> Hanna, May i ask you outt 😬
> — haziq

Buttons: `no` and `jommmm`.

- `no` can never be activated. It moves to a new random spot inside the
  visible screen when a pointer comes near it, on touch start, and on focus.
  It must never land on top of `jommmm` or off screen.
- Each dodge changes its label in order: "eh?", "cuba lagi", "tak boleh tekan la",
  "okay okay… jommmm je la", then keeps the last one.
- `jommmm` grows slightly with each dodge, up to a sensible limit.
- `jommmm` goes to step 2.

**2. Mood**: heading "yayy! jadi what are you in the mood for ?"
Multi-select chips: coffee, brunch, art gallery, museum, lunch, dinner
(list set by Haziq). Each mood is a flower (daisy, tulip, poppy, lily, lavender
sprig, strawberry) and each pick adds that flower to a drawn vase above the
chips. At least one needed to continue.

**3. Dates**: heading "bila free?"
Multi-select chips, all 2026: Sat 28 Nov, Sun 29 Nov, Sat 5 Dec, Sun 6 Dec,
Sat 19 Dec, Sun 20 Dec, Sat 26 Dec, Sun 27 Dec.
Shown as the stub of a boarding pass: from DM, to ???, passenger hanna,
destination a surprise, in the mood for her picks. A rubber stamp lands on the
ticket once she picks a day.
Plus "none of these, but i choose the date", which reveals a date picker and
a short free-text box. At least one date or her own date needed to continue.

**4. Note**: heading "anything you want to tell me?" Optional text box. `send` button.

**5. Done**: the vase exactly as she filled it, tagged "arranged by hanna ✿",
a one-line recap of her picks, "okieee. rest easy, i akan settlekan semua 🌷" and a button to
`https://instagram.com/zimekq`.

## Sending

`send` posts to Web3Forms with her moods, dates, own date if given, and note,
under a subject like "Hanna said jommmm 🌷". Show a sending state. If the
request fails, keep her answers, say so kindly, and offer retry plus the
Instagram button so the answer is not lost. The access key is a public key by
design and lives in the page; Haziq creates it at web3forms.com with his email.

## Look

Haziq's firm requirement: layout and design match Hanna's Instagram and vibe.
The page should read like one of her own posts or a page from her travel
scrapbook. Drawn from her feed:

- **Palette:** warm cream and linen as the base (her backgrounds are almost
  all off-white fabric, paper and walls), blush pink, soft sage green, and a
  small amount of strawberry and poppy red as the one strong accent. Warm
  wood brown for text instead of black. Nothing neon, no gradients, no dark mode.
- **Texture:** paper or linen grain on the background, like her quote post
  printed on textured paper.
- **Type:** a classic serif for the message (her quote post, "Every time you
  draw, cook, write, or arrange flowers", is set in one), a loose handwritten
  script for headings and small asides (her photo captions are white
  handwriting), all lowercase where the copy allows.
- **Motifs:** hand-drawn style flowers such as daisies, lilies, tulips and
  poppies; vintage batik and floral-print pattern as borders or chip
  backgrounds; a postage-stamp frame with perforated edge (she uses one on a
  travel post); washi tape, a photobooth-strip or polaroid frame, strawberries.
  All drawn in SVG or CSS, no photographs.
- **Layout:** one centred card per step, like a single Instagram post or a
  scrapbook page, generous empty space, slightly tilted taped-on elements,
  nothing dense. Chips look like little stamps or paper tags. A row of small
  dots or story-highlight style circles shows which step she is on.
- **Motion:** slow and soft, such as petals drifting and cards easing in.
  The No button is the only fast, silly thing on the page.

Phone first, fine on desktop. Respects reduced-motion settings (the No
button still dodges, without the animated glide).

## Left to the builder

Exact palette, fonts, floral artwork, transitions, wording of the error state
and of small helper text, back navigation between steps, and the email layout.
