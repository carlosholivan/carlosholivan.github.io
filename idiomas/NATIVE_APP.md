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

## Other notes

- A Trusted Web Activity (Android app that opens the site in Chrome) needs no plugin: Web Speech works as in Chrome.
- Keep `translate="no"` in each `index.html` so the system translator does not translate the lessons.
