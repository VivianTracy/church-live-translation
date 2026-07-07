export function startAudioLevelMonitor(
  analyser: AnalyserNode,
  onLevels: (level: number, peak: number) => void
): () => void {
  const data = new Uint8Array(analyser.fftSize);
  let decayPeak = 0;
  let animationId: number | null = null;

  const tick = () => {
    analyser.getByteTimeDomainData(data);

    let sum = 0;
    let localPeak = 0;

    for (let index = 0; index < data.length; index += 1) {
      const normalized = ((data[index] ?? 128) - 128) / 128;
      sum += normalized * normalized;
      localPeak = Math.max(localPeak, Math.abs(normalized));
    }

    const level = Math.sqrt(sum / data.length);
    decayPeak = Math.max(decayPeak * 0.96, localPeak);
    onLevels(level, decayPeak);
    animationId = requestAnimationFrame(tick);
  };

  animationId = requestAnimationFrame(tick);

  return () => {
    if (animationId !== null) {
      cancelAnimationFrame(animationId);
    }
  };
}
