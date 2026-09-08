# tts

**Permission string:** `tts`
**API namespace:** `chrome.tts`

## Interface (Chromium 153.0.8010.18)

Use the `chrome.tts` API to play synthesized text-to-speech (TTS). See also the related ttsEngine API, which allows an extension to implement a speech engine.

**Functions**
- `tts.speak()` — Speaks text using a text-to-speech engine.
- `tts.stop()` — Stops any current speech and flushes the queue of any pending utterances.
- `tts.pause()` — Pauses speech synthesis, potentially in the middle of an utterance.
- `tts.resume()` — If speech was paused, resumes speaking where it left off.
- `tts.isSpeaking()` — Checks whether the engine is currently speaking.
- `tts.getVoices()` — Gets an array of all available voices.

**Events**
- `tts.onVoicesChanged` — Called when the list of `tts.TtsVoice` that would be returned by getVoices has changed.

## What it's for (broad)

Speak text through the browser/system text-to-speech engines, with voice, rate, pitch, and event control. Broadly: read-aloud and accessibility, audio notifications, and hands-free or eyes-free interfaces.
