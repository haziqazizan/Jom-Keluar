# Jom Keluar

A one-page invitation. She reads the note, taps `jommmm` (the `no` button runs
away), picks what she is in the mood for and which days work, and her answer is
emailed through Web3Forms. Nothing is sent unless she taps `send`.

## Going live

1. On GitHub open **Settings → Pages**.
2. Under **Build and deployment** choose **Deploy from a branch**, pick the
   branch that holds these files and the `/ (root)` folder, then **Save**.
3. After a minute or two the page is at `https://haziqazizan.github.io/Jom-Keluar/`.
4. **Send yourself a test answer from that link before sharing it**, and check
   the email arrives (look in spam too).

## Changing things

- Words on the page: `index.html`.
- Moods, dates and the runaway button's lines: the lists at the top of `logic.js`.
- Colours and fonts: the variables at the top of `styles.css`.
- Web3Forms key: `WEB3FORMS_KEY` at the top of `app.js`.

## Tests

```bash
node --test tests/logic.test.mjs
```

```bash
node tests/e2e.mjs
```

The second one needs Playwright and Python 3, and walks through the whole page
on a phone-sized touch screen without sending a real email.
