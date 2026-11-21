# Turning the language apps into a native app (Capacitor)

The apps are plain web apps (GitHub Pages). To publish them as Android / iPhone apps, wrap them with
[Capacitor](https://capacitorjs.com). Everything works the same, except **speech recognition**: the WebView inside
a native app has no Web Speech API, so the "Speaking & listening" practice (`js/views/speak.js`, pronunciation and
the microphone in conversations) uses the native plugin when it is present. No code change is needed: `speak.js`
detects `window.Capacitor.Plugins.SpeechRecognition` and uses it automatically; in the browser it keeps using
the Web Speech API.

## Speech recognition plugin

```bash
npm install @capacitor-community/speech-recognition
npx cap sync
```

**Android** — `android/app/src/main/AndroidManifest.xml`:

```xml
<uses-permission android:name="android.permission.RECORD_AUDIO" />
<queries>
  <intent><action android:name="android.speech.RecognitionService" /></intent>
</queries>
```

**iOS** — `ios/App/App/Info.plist`:

```xml
<key>NSMicrophoneUsageDescription</key>
<string>The microphone is used to check your pronunciation.</string>
<key>NSSpeechRecognitionUsageDescription</key>
<string>Speech recognition is used to check your pronunciation.</string>
```

What `speak.js` calls: `available()`, `checkPermissions()` / `requestPermissions()`, `start({ language, maxResults: 4,
partialResults: true, popup: false })`, the `partialResults` and `listeningState` events, `stop()` and
`removeAllListeners()`. On iOS, where recognition does not stop by itself, it stops after ~1.6 s of silence.

Languages used: es-ES, en-GB, fr-FR, de-DE, zh-CN, ja-JP, ar-SA (the phone must have that language available for
dictation; on iPhone, Siri & Dictation must be enabled).

## Daily reminders (notifications)

`js/reminders.js` (Settings → Daily reminder) picks the right mechanism by itself:

| Where it runs | How the reminder arrives | Needs |
|---|---|---|
| Browser, installed web app, or Android **TWA** | Web push (Firebase Cloud Messaging), sent by `.github/workflows/reminders.yml` only on days the learner has not studied (any device) | Signed-in account + repository secret `FIREBASE_SERVICE_ACCOUNT` |
| **Capacitor** app (Android / iPhone) | **Local notifications** scheduled on the phone for the next 14 days; today's is cancelled as soon as the learner studies | Only the plugin below — no server, no account, works offline |
| Anywhere | “Add to my calendar”: a daily event with an alarm (.ics) | Nothing |

For the Capacitor app:

```bash
npm install @capacitor/local-notifications
npx cap sync
```

**Android** — Android 13+ asks for permission at runtime (the plugin declares `POST_NOTIFICATIONS`); for exact
times on Android 12+ add to `AndroidManifest.xml`:

```xml
<uses-permission android:name="android.permission.SCHEDULE_EXACT_ALARM" />
```

Optional: a white notification icon `res/drawable/ic_stat_icon.png` and, in `capacitor.config`,
`plugins.LocalNotifications.smallIcon = "ic_stat_icon"`, `iconColor = "#9c7842"`.

**iOS** — nothing to add; the permission prompt appears when the learner taps “Turn on notifications”.

What `reminders.js` calls: `checkPermissions()` / `requestPermissions()`, `getPending()`, `cancel()`, `schedule()`
(ids 7100–7119). Limitation: a phone only knows about study done on that phone, so studying on another device does
not cancel its reminder (the web-push route does take every device into account).

## Other notes

- A Trusted Web Activity (Android app that opens the site in Chrome) needs no plugin: Web Speech works as in Chrome.
- Keep `translate="no"` in each `index.html` so the system translator does not translate the lessons.
