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

On **http://localhost:3000/operator-openai**:

- **Font size:** Small / Medium / Large
- **Caption box position:** Bottom / Lower third / Top
- **Text alignment:** Left / Center / Right

Changes apply to `/overlay` within about one second.

## YouTube viewers

Captions appear on YouTube when this Browser Source is visible in the **Program** scene that goes to stream. Viewers do not open `localhost` — OBS composites the overlay into the video.

## Local test without YouTube

1. Run Church Caption (`npm run dev`).
2. Open `/operator-openai`, start captions with test audio.
3. Watch the overlay preview on the operator page or open `/overlay` in a second browser window.

## Import scene collection (optional)

A starter OBS scene JSON can be added here later. For now, add the Browser Source manually using the steps above.
