import {
  createTranslationSessionResources,
  stopTranslationSessionResources,
} from "@/lib/translationSessionResources";
import { describe, expect, it, vi } from "vitest";

describe("stopTranslationSessionResources", () => {
  it("stops every acquired resource after a failed startup", () => {
    const receiverStop = vi.fn();
    const senderStop = vi.fn();
    const micStop = vi.fn();
    const inputMonitorStop = vi.fn();
    const outputMonitorStop = vi.fn();
    const peerClose = vi.fn();
    const inputClose = vi.fn();
    const monitorClose = vi.fn();
    const audio = {
      pause: vi.fn(),
      currentTime: 12,
      srcObject: {},
      removeAttribute: vi.fn(),
      load: vi.fn(),
      remove: vi.fn(),
    };
    const resources = createTranslationSessionResources();
    const disconnectTimer = setTimeout(() => {
      throw new Error("disconnect timer should have been cleared");
    }, 60_000);

    resources.micStream = { getTracks: () => [{ stop: micStop }] };
    resources.inputContext = { close: inputClose };
    resources.stopInputMonitor = inputMonitorStop;
    resources.peerConnection = {
      getReceivers: () => [{ track: { stop: receiverStop } }],
      getSenders: () => [{ track: { stop: senderStop } }],
      close: peerClose,
    };
    resources.transmitterAudio = audio;
    resources.monitorContext = { close: monitorClose };
    resources.stopOutputMonitor = outputMonitorStop;
    resources.disconnectTimer = disconnectTimer;

    stopTranslationSessionResources(resources);

    expect(inputMonitorStop).toHaveBeenCalledTimes(1);
    expect(outputMonitorStop).toHaveBeenCalledTimes(1);
    expect(audio.pause).toHaveBeenCalledTimes(1);
    expect(audio.remove).toHaveBeenCalledTimes(1);
    expect(receiverStop).toHaveBeenCalledTimes(1);
    expect(senderStop).toHaveBeenCalledTimes(1);
    expect(peerClose).toHaveBeenCalledTimes(1);
    expect(micStop).toHaveBeenCalledTimes(1);
    expect(inputClose).toHaveBeenCalledTimes(1);
    expect(monitorClose).toHaveBeenCalledTimes(1);
    expect(resources.micStream).toBeNull();
    expect(resources.peerConnection).toBeNull();
    expect(resources.transmitterAudio).toBeNull();
    expect(resources.disconnectTimer).toBeNull();
  });

  it("is safe to call before any resources exist", () => {
    const resources = createTranslationSessionResources();

    expect(() => stopTranslationSessionResources(resources)).not.toThrow();
  });
});
