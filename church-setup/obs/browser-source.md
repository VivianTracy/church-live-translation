# OBS Browser Source — Church Caption overlay

## Add the overlay

1. Open OBS on the streaming computer.
2. In your **Sermon** (or Program) scene, click **+** → **Browser**.
3. Name it `Church Caption Overlay`.
4. URL: `http://localhost:3000/overlay`
5. Width: **1920**, Height: **1080**
6. Check **Refresh browser when scene becomes active**.
7. Leave **Shutdown source when not visible** unchecked (keeps captions ready).

## Position in OBS

- Drag the Browser Source to the lower third (or use operator **Caption box position** presets).
- Resize the source box if needed — caption text layout is controlled on the operator page.

## Font and alignment

On **http://localhost:3000/caption-settings**:

- **Font size:** Small / Medium / Large
- **Caption box position:** Bottom / Lower third / Top
- **Text alignment:** Left / Center / Right

Changes apply to `/overlay` within about one second.

## YouTube viewers

Captions appear on YouTube when this Browser Source is visible in the **Program** scene that goes to stream. Viewers do not open `localhost` — OBS composites the overlay into the video.

## Local test without YouTube

1. Run Church Caption (`npm run dev`).
2. Open `/operator-caption`, start captions with test audio.
3. Watch the overlay preview on the operator page or open `/overlay` in a second browser window.

## Import scene collection (optional)

A starter OBS scene collection is included:

`church-setup/obs/church-caption-scenes.json`

### Mac / Linux

1. Quit OBS.
2. Copy the file into your OBS scenes folder:
   - macOS: `~/Library/Application Support/obs-studio/basic/scenes/`
   - Linux: `~/.config/obs-studio/basic/scenes/`
3. Rename if needed (filename becomes the collection name in OBS).
4. Launch OBS → **Scene Collection** → select **Church Caption**.

Or use **Scene Collection → Import** in OBS and select the JSON file (check the checkbox next to the file in the import list).

### Windows

1. Quit OBS.
2. Copy the file to `%APPDATA%\obs-studio\basic\scenes\`
3. Launch OBS → **Scene Collection** → select **Church Caption**.

The imported scene includes a **Sermon** scene with a Browser Source already pointed at `http://localhost:3000/overlay`. Add your camera and audio sources to the same scene as needed.
