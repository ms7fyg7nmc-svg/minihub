# Wheel Rush

A free, ad-free, 3-lane endless runner built as a standalone Android app.
Its only job: be a fun little game on its own, and hand off players who
want more to the minihub Telegram bot (`@minihubgames_bot`) at game over.

Not connected to minihub's Telegram Mini App code in any way — this is a
separate, self-contained web app (`www/`) wrapped in a native Android
shell via [Capacitor](https://capacitorjs.com/), so it can live on the
Play Store where it can be found through normal app-store search
("wheel race", "tire race", "endless runner", etc.) instead of only
inside Telegram.

## What's already done

- The game itself (`www/index.html`, `www/style.css`, `www/game.js`) —
  playable right now, zero dependencies, works by just opening
  `www/index.html` in any browser.
- A Capacitor Android project (`android/`) wired up to that game, with a
  real app icon and splash screen already generated
  (`assets/icon.png`, `assets/splash.png` — regenerate via
  `npx capacitor-assets generate --android` if you tweak `icon-src.html`
  / `splash-src.html` and re-export them).
- Store listing copy ready to paste in (`STORE_LISTING.md`).
- A privacy policy page ready to host (`www/privacy-policy.html`) — Play
  Console requires a live URL for this before it'll let you publish.

## What you still need to do (needs your own machine + accounts)

This dev environment doesn't have a JDK or the Android SDK installed, so
the actual APK/AAB has to be built on your side. It's a normal Android
project though — nothing custom or fragile about the setup.

1. **Install [Android Studio](https://developer.android.com/studio)**
   (free). It bundles the JDK and lets you install the Android SDK
   through its own SDK Manager on first launch — no manual setup needed.
2. **Open this project**: Android Studio → Open → select the `android/`
   folder here (not the repo root, the `android/` subfolder).
3. Let Gradle sync (first time takes a few minutes). Hit ▶ Run to test
   on an emulator or a phone plugged in over USB with developer mode on.
4. When you're happy with it, **Build → Generate Signed Bundle / APK**
   to produce a release `.aab` — Android Studio walks you through
   creating a signing key the first time. **Keep that keystore file and
   its password somewhere safe** — you need the exact same one for
   every future update, and there's no recovery if you lose it.
5. **Create a Google Play Console account** ($25 one-time fee,
   developer.google.com/play) if you don't have one, create a new app,
   and work through Play Console's setup checklist:
   - Upload the `.aab` from step 4
   - Paste in the copy from `STORE_LISTING.md`
   - Host `www/privacy-policy.html` somewhere public (a GitHub Pages
     page, or a route on your own domain) and paste that URL into
     App content → Privacy policy
   - Take 2+ screenshots from your own test run (emulator or phone) for
     the store listing — the in-game HUD is legible at any size, so a
     plain gameplay screenshot works fine
   - Fill out the content rating questionnaire (nothing in this app
     should trip any flags — no ads, no purchases, no user content)
6. Submit for review. Google's first review of a new app typically
   takes anywhere from a few hours to a few days.

## Changing branding later

- App name / package id: edit `capacitor.config.json`, then re-run
  `npx cap sync android`.
- Icon / splash: edit `icon-src.html` / `splash-src.html` (plain canvas
  drawing, open directly in a browser to preview), export a fresh
  `assets/icon.png` (1024×1024) and `assets/splash.png` (2000×2000+),
  then re-run `npx capacitor-assets generate --android`.
- The "More free games" button in `www/index.html` points at
  `https://t.me/minihubgames_bot` — update if the bot username changes.

## Local dev loop (no Android tooling needed)

Just open `www/index.html` in a browser, or serve the folder with
anything static (`python3 -m http.server` from inside `www/`). The game
has no build step.
