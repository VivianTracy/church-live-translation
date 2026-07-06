import { OPENAI_REALTIME_CALLS_URL } from "@/lib/openaiModels";

type TranscriptionCallbacks = {
  onDelta: (delta: string, displayText: string) => void;
  onFinal: (transcript: string) => void;
  onListeningChange: (isListening: boolean) => void;
  onError: (message: string) => void;
};

type TranscriptionSession = {
  stop: () => void;
};

function getDisplayTranscript(
  finals: string[],
  interim: string
): string {
  const committed = finals.join(" ").trim();
  return `${committed}${interim}`.trim();
}

export async function connectOpenAITranscription(
  callbacks: TranscriptionCallbacks
): Promise<TranscriptionSession> {
  const sessionResponse = await fetch("/api/openai/transcription-session", {
    method: "POST",
  });

  const sessionData = (await sessionResponse.json()) as {
    clientSecret?: string;
    error?: string;
  };

  if (!sessionResponse.ok || !sessionData.clientSecret) {
    throw new Error(
      sessionData.error ?? "Could not create OpenAI transcription session."
    );
  }

  const mediaStream = await navigator.mediaDevices.getUserMedia({ audio: true });
  const peerConnection = new RTCPeerConnection();
  const finals: string[] = [];
  let interim = "";

  peerConnection.addTrack(mediaStream.getAudioTracks()[0], mediaStream);

  const events = peerConnection.createDataChannel("oai-events");

  events.onmessage = ({ data }) => {
    const event = JSON.parse(data as string) as {
      type?: string;
      delta?: string;
      transcript?: string;
    };

    if (event.type === "conversation.item.input_audio_transcription.delta") {
      interim += event.delta ?? "";
      callbacks.onDelta(
        event.delta ?? "",
        getDisplayTranscript(finals, interim)
      );
      return;
    }

    if (event.type === "conversation.item.input_audio_transcription.completed") {
      const transcript = (event.transcript ?? "").trim();

      if (transcript) {
        finals.push(transcript);
        callbacks.onFinal(transcript);
      }

      interim = "";
      callbacks.onDelta("", getDisplayTranscript(finals, interim));
    }
  };

  events.onopen = () => {
    callbacks.onListeningChange(true);
  };

  peerConnection.onconnectionstatechange = () => {
    if (peerConnection.connectionState === "failed") {
      callbacks.onError("OpenAI transcription connection failed.");
      callbacks.onListeningChange(false);
    }
  };

  const offer = await peerConnection.createOffer();
  await peerConnection.setLocalDescription(offer);

  const sdpResponse = await fetch(OPENAI_REALTIME_CALLS_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${sessionData.clientSecret}`,
      "Content-Type": "application/sdp",
    },
    body: offer.sdp,
  });

  if (!sdpResponse.ok) {
    throw new Error(await sdpResponse.text());
  }

  await peerConnection.setRemoteDescription({
    type: "answer",
    sdp: await sdpResponse.text(),
  });

  return {
    stop() {
      mediaStream.getTracks().forEach((track) => track.stop());
      peerConnection.close();
      callbacks.onListeningChange(false);
    },
  };
}
