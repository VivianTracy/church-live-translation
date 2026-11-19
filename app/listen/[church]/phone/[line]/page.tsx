import { TranslationListenPage } from "@/components/TranslationListenPage";
import { getActiveChurchBySlug } from "@/lib/churchListen";
import { parseChurchSlug } from "@/lib/churchSlug";
import {
  headsetLanguageFromPhoneLine,
  phoneLanguageSlug,
} from "@/lib/translationPhoneLine";

type ListenPhoneLinePageProps = {
  params: Promise<{ church: string; line: string }>;
};

export default async function ListenPhoneLinePage({
  params,
}: ListenPhoneLinePageProps) {
  const { church, line } = await params;
  const slug = parseChurchSlug(church);
  const record = slug ? await getActiveChurchBySlug(slug) : null;

  const language = headsetLanguageFromPhoneLine(line);

  if (!language) {
    return (
      <main className="min-h-screen bg-stone-950 px-5 py-10 text-white">
        <div className="mx-auto max-w-md text-center">
          <h1 className="text-3xl font-bold">Phone translation</h1>
          <p className="mt-3 text-zinc-400">
            This listener link is not a spoken language. Ask the operator for
            the QR code from the language window.
          </p>
        </div>
      </main>
    );
  }

  return (
    <TranslationListenPage
      churchSlug={church}
      churchName={record?.name}
      line={phoneLanguageSlug(language)}
    />
  );
}
