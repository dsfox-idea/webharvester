# ttsEngine

**Permission string:** `ttsEngine`
**API namespace:** `chrome.ttsEngine`

## Interface (Chromium 153.0.8010.18)

Use the `chrome.ttsEngine` API to implement a text-to-speech(TTS) engine using an extension. If your extension registers using this API, it will receive events containing an utterance to be spoken and other parameters when any extension or Chrome App uses the tts API to generate speech. Your extension can then use any available web technology to synthesize and output the speech, and send events back to the calling function to report the status.

**Functions**
- `ttsEngine.updateVoices()` — Called by an engine to update its list of voices.
- `ttsEngine.updateLanguage()` — Called by an engine when a language install is attempted, and when a language is uninstalled.

**Events**
- `ttsEngine.onSpeak` — Called when the user makes a call to tts.speak() and one of the voices from this extension's manifest is the first to match the options object.
- `ttsEngine.onSpeakWithAudioStream` — Called when the user makes a call to tts.speak() and one of the voices from this extension's manifest is the first to match the options object.
- `ttsEngine.onStop` — Fired when a call is made to tts.stop and this extension may be in the middle of speaking.
- `ttsEngine.onPause` — Optional: if an engine supports the pause event, it should pause the current utterance being spoken, if any, until it receives a resume event or stop event.
- `ttsEngine.onResume` — Optional: if an engine supports the pause event, it should also support the resume event, to continue speaking the current utterance, if any.
- `ttsEngine.onInstallLanguageRequest` — Fired when a TTS client requests to install a new language.
- `ttsEngine.onUninstallLanguageRequest` — Fired when a TTS client indicates a language is no longer needed.
- `ttsEngine.onLanguageStatusRequest` — Fired when a TTS client requests the install status of a language.

## What it's for (broad)

Register the extension itself as a TTS voice provider that other extensions and pages can use. Broadly: ship custom, higher-quality, or cloud-backed voices and languages to the whole browser.
