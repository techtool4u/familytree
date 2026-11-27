# OurFamilyTree on Android and iPhone

One codebase, three apps. The React app is wrapped with [Capacitor](https://capacitorjs.com), so the
same `src/` code runs as the website / PWA, an Android app (`android/`) and an iOS app (`ios/`).

| | Web / PWA | Android | iPhone / iPad |
|---|---|---|---|
| Project | `dist/` (built) | `android/` (Android Studio) | `ios/` (Xcode) |
| App ID | — | `com.techtool4u.ourfamilytree` | `com.techtool4u.ourfamilytree` |
| Built by GitHub Actions | `CI`, `Deploy to GitHub Pages` | `Mobile apps` → debug APK download | `Mobile apps` → compile check |

`appId` is set in `capacitor.config.ts`. It becomes permanent once the app is in a store, so change it
before the first upload if you want a different one.

## Try the Android app today (no accounts needed)

1. Open the repo's **Actions** tab → latest **Mobile apps** run → **Artifacts** → download
   `OurFamilyTree-android-debug-apk`, and unzip it.
2. Copy `app-debug.apk` to an Android phone and open it (allow "Install unknown apps" when asked).

This is a test build. Data lives on the phone, separate from the browser version: use
**⋯ → Export tree as JSON** in one and **Import** in the other to move a tree across.

## Working on the apps locally

Needs Node 22+. Android needs Android Studio (with JDK 21). iOS needs a Mac with Xcode.

```bash
npm install
npm run android   # builds the web app, copies it in, opens Android Studio
npm run ios       # same for Xcode (Mac only)
```

After any change to `src/`, run `npm run cap:sync` to copy the new build into both native projects.
Press ▶ in Android Studio or Xcode to run on an emulator, simulator or a plugged-in phone.

## Publishing to the stores

### Google Play
1. Create a Google Play developer account (one-off US$25).
2. In Android Studio: **Build → Generate Signed App Bundle** → create an upload key. Keep the
   keystore file and passwords safe and **never commit them**.
3. Upload the `.aab` in Play Console, fill in the store listing, privacy policy and content rating, and
   start with an internal test track.

### Apple App Store
1. Join the Apple Developer Program (US$99 a year). A Mac with Xcode is required.
2. Open `ios/App/App.xcodeproj`, choose your team under **Signing & Capabilities**.
3. **Product → Archive**, then **Distribute App** to App Store Connect. Test with TestFlight first,
   then submit for review.

Store listings need a **privacy policy**: OurFamilyTree keeps all data on the device, records audio only when
the user taps record, and uses the internet only for map place look-ups (OpenStreetMap).

Signed store builds can later be automated in GitHub Actions by adding the signing keys as repository
secrets.

## How the native apps differ from the website

- **Saving files** (JSON / GEDCOM export, tree PNG/SVG, calendar file) opens the phone's share sheet
  (Save to Files, Drive, Mail, WhatsApp) instead of a browser download. See `src/lib/native.ts`.
- **WhatsApp / email links** open the real apps.
- **Microphone** (voice stories, time capsules) and **photos** ask for permission the first time.
  The permission texts are in `ios/App/App/Info.plist` and `android/app/src/main/AndroidManifest.xml`.
- No service worker: everything is bundled inside the app, so it works offline anyway.
- Icons and splash screens come from `assets/` (generated from the OurFamilyTree logo).
