import { TranslationCaptionPage } from "@/components/TranslationCaptionPage";
import { getActiveChurchBySlug } from "@/lib/churchListen";
import { parseChurchSlug } from "@/lib/churchSlug";
import { parseCaptionTrack } from "@/lib/translationCaptionTrack";
import type { Metadata } from "next";

type CaptionChurchPageProps = {
  params: Promise<{ church: string; track: string }>;
};

export async function generateMetadata({
  params,
}: CaptionChurchPageProps): Promise<Metadata> {
  const { track } = await params;
  const parsed = parseCaptionTrack(track);
  const title =
    parsed === "translation"
      ? "Translation captions"
      : parsed === "original"
        ? "Original captions"
        : "Captions";

  return {
    title: `${title} · Church Translation`,
    robots: { index: false, follow: false },
  };
}

function CaptionLinkMessage({
  title,
  body,
}: {
  title: string;
  body: string;
}) {
  return (
    <main className="min-h-screen bg-stone-950 px-5 py-10 text-white">
      <div className="mx-auto flex min-h-[calc(100vh-5rem)] max-w-md flex-col justify-center gap-4 text-center">
        <p className="text-sm font-semibold uppercase tracking-wide text-emerald-400">
          Church Translation
        </p>
        <h1 className="text-3xl font-bold">{title}</h1>
        <p className="text-zinc-400">{body}</p>
      </div>
    </main>
  );
}

export default async function CaptionChurchPage({
  params,
}: CaptionChurchPageProps) {
  const { church, track } = await params;
  const slug = parseChurchSlug(church);
  const parsedTrack = parseCaptionTrack(track);

  if (!slug || !parsedTrack) {
    return (
      <CaptionLinkMessage
        title="This caption link is not valid."
        body="Scan the original or translation QR code on the operator screen again."
      />
    );
  }

  const record = await getActiveChurchBySlug(slug);

  return (
    <TranslationCaptionPage
      churchSlug={slug}
      track={parsedTrack}
      churchName={record?.name}
    />
  );
}
