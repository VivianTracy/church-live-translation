type SpeechRecognitionErrorCode =
  | "aborted"
  | "audio-capture"
  | "bad-grammar"
  | "language-not-supported"
  | "network"
  | "no-speech"
  | "not-allowed"
  | "service-not-allowed";

interface SpeechRecognitionResultList {
  length: number;
  [index: number]: {
    isFinal: boolean;
    [index: number]: {
      transcript: string;
    };
  };
}

interface SpeechRecognitionEvent {
  resultIndex: number;
  results: SpeechRecognitionResultList;
}

interface SpeechRecognitionErrorEvent {
  error: SpeechRecognitionErrorCode;
  message?: string;
}

type SpeechRecognitionConstructor = new () => {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  onstart: (() => void) | null;
  onresult: ((event: SpeechRecognitionEvent) => void) | null;
  onerror: ((event: SpeechRecognitionErrorEvent) => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
  abort: () => void;
};

declare global {
  interface Window {
    SpeechRecognition?: SpeechRecognitionConstructor;
    webkitSpeechRecognition?: SpeechRecognitionConstructor;
  }
}

export {};
