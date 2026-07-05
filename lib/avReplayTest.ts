export const AV_REPLAY_TEST = {
  issue: 24,
  sourceUrl: "https://www.youtube.com/live/2WlnOjEMJbA",
  segmentLabel: "47:00 – 54:00",
  audioPath: "/test-audio/sermon-replay-47-54.wav",
  fixturePath: "fixtures/audio/sermon-replay-47-54.wav",
} as const;

export const AV_REPLAY_MAC_STEPS = [
  "Install BlackHole 2ch (virtual audio device).",
  "Open OBS and add a Media Source using the test clip file, or play the clip below and set OBS Audio Monitoring to BlackHole.",
  "In Chrome site settings for localhost, set Microphone to BlackHole 2ch.",
  "On /operator, save sermon manuscript context, then click Start Microphone.",
  "Play the OBS media source (or the verification player below routed through BlackHole). Chrome STT receives the digital feed, not room audio.",
] as const;

export const AV_REPLAY_WINDOWS_STEPS = [
  "Install VB-Audio Virtual Cable on the church streaming PC.",
  "Route the test clip through OBS with monitoring to CABLE Input, matching the future X-USB workflow.",
  "In Chrome, set Microphone to CABLE Output.",
  "Save sermon context, start microphone, then play the clip through OBS.",
] as const;
