"use client";

import QRCode from "react-qr-code";

type LiveUrlQrCodeProps = {
  url: string;
  size?: number;
};

export function LiveUrlQrCode({ url, size = 200 }: LiveUrlQrCodeProps) {
  const isReady = url.startsWith("http");

  return (
    <div
      className="mx-auto flex items-center justify-center rounded-2xl bg-white p-4 ring-1 ring-slate-200"
      style={{ width: size + 32, height: size + 32 }}
      aria-label={isReady ? `QR code for ${url}` : "Loading audience QR code"}
    >
      {isReady ? (
        <QRCode
          value={url}
          size={size}
          bgColor="#ffffff"
          fgColor="#0f172a"
          level="M"
        />
      ) : (
        <div
          className="animate-pulse rounded-xl bg-slate-100"
          style={{ width: size, height: size }}
        />
      )}
    </div>
  );
}
