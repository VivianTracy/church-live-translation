export type StoppableTrack = {
  stop: () => void;
};

export type StoppableStream = {
  getTracks: () => StoppableTrack[];
};

export type StoppablePeerConnection = {
  getReceivers: () => Array<{ track?: StoppableTrack | null }>;
  getSenders: () => Array<{ track?: StoppableTrack | null }>;
  close: () => void;
};

export type StoppablePlaybackElement = {
  pause: () => void;
  currentTime: number;
  srcObject: unknown;
  removeAttribute: (name: string) => void;
  load: () => void;
  remove: () => void;
};

export type StoppableAudioContext = {
  close: () => Promise<void> | void;
};

export type TranslationSessionResources = {
  micStream: StoppableStream | null;
  inputContext: StoppableAudioContext | null;
  stopInputMonitor: (() => void) | null;
  peerConnection: StoppablePeerConnection | null;
  transmitterAudio: StoppablePlaybackElement | null;
  monitorContext: StoppableAudioContext | null;
  stopOutputMonitor: (() => void) | null;
  stopPcmUpload: (() => void) | null;
  disconnectTimer: ReturnType<typeof setTimeout> | null;
};

export function createTranslationSessionResources(): TranslationSessionResources {
  return {
    micStream: null,
    inputContext: null,
    stopInputMonitor: null,
    peerConnection: null,
    transmitterAudio: null,
    monitorContext: null,
    stopOutputMonitor: null,
    stopPcmUpload: null,
    disconnectTimer: null,
  };
}

export function stopPlaybackElement(audio: StoppablePlaybackElement): void {
  audio.pause();
  audio.currentTime = 0;
  audio.srcObject = null;
  audio.removeAttribute("src");
  audio.load();
  audio.remove();
}

export function stopPeerConnectionTracks(
  peerConnection: StoppablePeerConnection
): void {
  for (const receiver of peerConnection.getReceivers()) {
    receiver.track?.stop();
  }

  for (const sender of peerConnection.getSenders()) {
    sender.track?.stop();
  }
}

export function stopTranslationSessionResources(
  resources: TranslationSessionResources
): void {
  if (resources.disconnectTimer) {
    clearTimeout(resources.disconnectTimer);
    resources.disconnectTimer = null;
  }

  resources.stopInputMonitor?.();
  resources.stopInputMonitor = null;
  resources.stopOutputMonitor?.();
  resources.stopOutputMonitor = null;
  resources.stopPcmUpload?.();
  resources.stopPcmUpload = null;

  if (resources.transmitterAudio) {
    stopPlaybackElement(resources.transmitterAudio);
    resources.transmitterAudio = null;
  }

  if (resources.peerConnection) {
    stopPeerConnectionTracks(resources.peerConnection);
    resources.peerConnection.close();
    resources.peerConnection = null;
  }

  resources.micStream?.getTracks().forEach((track) => track.stop());
  resources.micStream = null;

  void resources.inputContext?.close();
  resources.inputContext = null;
  void resources.monitorContext?.close();
  resources.monitorContext = null;
}
