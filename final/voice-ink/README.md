# Voice ink

Hold the button on one Feather to leave a voice note for the other. The Express server transcribes the clip with Cartesia and renders a 296×128 monochrome bitmap in JavaScript. Both boards use the same hardware and protocol.

| When | What appears on the board |
| --- | --- |
| Daily wake or power-on | The newest note from the other person, for example `Ben: On my way`. Before the first note, an invitation to hold the button. |
| Successful send | Your own note, exactly as the other board will display it. It stays until the next wake or send. |
| Failed send with a frame | A retry notice. The next daily wake restores the other person's note. |

If two notes arrive between wakes, the next wake shows the newer one. The history endpoint retains both.

The renderer tries 20, 16, and 14 px text. If seven lines at 14 px cannot hold the note, the last line ends with an ellipsis. The history endpoint retains the full transcript.

## The vines

Each pair starts with a small shoot at iteration 2. After the first note, every complete local day without a note from either person adds one iteration, up to 30. Through iteration 12, the vines frame the text and leave it clear. Then tendrils grow across the words. By about iteration 28, they cover most of the note.

The first note on a local day keeps half the growth above 2, rounded down. After a month of silence, a note brings the vines from 30 to 16. A note the next day brings them to 9. More notes on the same day leave the vines at that day's level. To make a note clear the vines back to 2, set `KEEP` to `0` in `server/src/growth.ts`.

Each board uses its own `timeZone`. A note counts immediately, and a completed silent day shows at the next morning's wake. When the boards count a note on different dates, their iterations can differ. A successful send shows the recipient's view. The board uses its existing firmware to draw each 4,736-byte frame.

## Run the server

Install Node.js 24 or later. From the repository root, run the following commands.

```sh
cd final/voice-ink/server
npm ci
cp devices.example.json devices.json
cp .env.example .env
```

In `devices.json`, give each board a different random bearer token. Set the names, pairing, local wake times, and time zones. Put your Cartesia API key in `.env`. Then run `npm start`. Visit `http://localhost:3000/healthz` to check the service. For boards on separate Wi-Fi networks, point both at the same reachable HTTPS origin and terminate TLS in front of Express. Keep the API key on the server.

Run one server process per data directory. It appends notes to `messages.jsonl`. Keep this directory across restarts. The server sends normalized audio to Cartesia and stores the transcript. Each successful send logs up to the first 40 transcript characters.

### Configuration

Relative paths resolve from the server working directory.

| Setting | Default or purpose |
| --- | --- |
| `CARTESIA_API_KEY` | Required for server STT and simulator TTS. |
| `PORT` | `3000` |
| `DEVICES_FILE` | `devices.json` |
| `DATA_DIR` | `data` |
| `CARTESIA_VOICE_ID` | Simulator voice for `--say`. Defaults to `db6b0ed5-d5d3-463d-ae85-518a07d3c2b4`. |

The device file has a top-level `devices` array. Each entry has these fields.

| Field | Example | Rule |
| --- | --- | --- |
| `id` | `a` | Unique, 1–32 lowercase letters, digits, or hyphens. |
| `name` | `Ana` | Display prefix, 1–16 characters. |
| `peer` | `b` | The other board's ID. Its entry points back to this ID. |
| `token` | Generate per board | At least 16 characters. Send this value in the bearer header. |
| `wakeAt` | `07:00` | Local 24-hour time in HH:MM format. |
| `timeZone` | `Europe/London` | IANA time zone for this board's wake. |

### Preview and simulate

Use `npm run preview` to render example screens into `out/preview-*.png`. The six `out/preview-iteration-*.png` files show the same note at iterations 2, 12, 16, 20, 25, and 30. To exercise both directions against the running server, open another terminal in `final/voice-ink/server`.

```sh
npm run simulate -- --from a --say 'I miss you'
npm run simulate -- --from b --say 'On my way'
```

The simulator synthesizes audio with Cartesia. To supply a microphone capture, replace `--say 'I miss you'` with `--pcm recording.pcm`. Add `--server https://your-host` for a remote server. The simulator saves the sender's response in `out/<from>-after-send.png` and the peer's screen in `out/<peer>.png`. It compares their bytes after each successful send and prints the stored transcript.

Run `npm run typecheck` and `npm test` to check the server locally. The adapter tests use a local HTTP server.

## Device protocol

All device routes start with `/api/devices/:id` and require `Authorization: Bearer <token>` for that ID. A frame body uses `application/octet-stream`. Every frame response includes `X-Sleep-Seconds`, a positive number of seconds until this board's next local wake.

| Method and path | Request | Response |
| --- | --- | --- |
| `GET /screen` | Daily timer wake or power-on | 200 and the latest incoming frame. |
| `POST /messages` | Raw signed 16-bit little-endian mono PCM at 16 kHz. Use `application/octet-stream`. Chunked encoding is supported. Limit 512,000 bytes. | 201 and the sender's frame with `X-Message-Id`, or a notice frame with `X-Error`. |
| `GET /screen.png` | Operator preview | 200 and an `image/png` decoded from the peer note's packed pixels. |
| `GET /messages` | Debug history | 200 and the last 20 messages in both directions, oldest first. |

The public `GET /healthz` route returns `{"ok":true}`.

| Status | Code | Body |
| --- | --- | --- |
| 401 | `bad_token` | JSON |
| 404 | `unknown_device` | JSON |
| 413 | `too_large` | JSON |
| 415 | `unsupported_media_type` | JSON |
| 422 | `too_short`, `no_speech` | Frame |
| 502 | `stt_failed` | Frame |
| 500 | `internal` | JSON |

JSON errors have the shape `{"error":"bad_token"}`. Frames contain exactly 4,736 bytes. Rows run top to bottom with 37 bytes per row. The most significant bit is the leftmost pixel in each byte. A set bit draws black.

## Feather firmware integration

Use an ESP32 Feather, a 2.9-inch 296×128 e-ink display, an Adafruit ICS-43434 I2S microphone, a battery, a slide power switch, and a hold-to-talk button. Implement these rules in each board's firmware.

1. On power-up or a timer wake, connect to Wi-Fi and fetch `/screen` once. A wake within the hour before the scheduled time counts as that day's fetch, including a power-on. At a daylight-saving transition, a repeated wake time uses the first occurrence. A missing wake time moves forward by the size of the gap.
2. On button wake, light the Feather LED and start I2S before Wi-Fi. Record while held, for up to 15 seconds. Start the Wi-Fi connection during recording. A release under 0.3 seconds can return directly to sleep. Turn off the LED when recording ends.
3. Set I2S to 16 kHz with 32-bit slots. Ground the mic's L/R pin and read the left channel. Convert each sample with `(int16_t)(raw32 >> 16)` and send it little-endian. The server removes DC offset and amplifies quiet clips. If 16 kHz capture sounds poor, sample at 32 kHz and average each pair of samples before sending.
4. Buffer clips in PSRAM and POST once after release. A 15-second clip occupies 480,000 bytes. On a Feather without PSRAM, buffer the start while Wi-Fi connects and send the recording as one chunked upload. Finish the request on release. Use an HTTP timeout of at least 45 seconds. A repeated POST can duplicate a note.
5. For any frame response, including a 422 or 502, check the media type and byte count. Set `setRotation(1)`, clear the display buffer to white, and call `drawBitmap(0, 0, buf, 296, 128, EPD_BLACK)`. Perform one full refresh.
6. Set the timer with `esp_sleep_enable_timer_wakeup((uint64_t)sleepSeconds * 1000000ULL)` and use the button as an `ext0` wake source. A send response schedules the next local wake even when it falls within the next hour. On network failure, a non-frame body, or an invalid timer header, keep the existing panel image and sleep for 3,600 seconds.
