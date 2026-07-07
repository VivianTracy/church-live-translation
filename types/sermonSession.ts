export type CaptionMode = "sermon" | "others";

export type SermonSessionStatus = "recording" | "paused" | "ended";

export type SermonSession = {
  id: string;
  startedAt: number;
  status: SermonSessionStatus;
  chineseFile: string;
  englishFile: string;
  segmentsFile: string;
};

export type SermonSegment = {
  timestamp: number;
  offsetMs: number;
  chinese: string;
  english: string;
};

export type SermonSessionRequest =
  | { action: "start" }
  | { action: "pause" }
  | { action: "resume" }
  | { action: "end" }
  | { action: "append"; chinese: string; english: string };
