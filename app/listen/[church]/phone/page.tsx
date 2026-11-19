import { TranslationListenPage } from "@/components/TranslationListenPage";
import { getActiveChurchBySlug } from "@/lib/churchListen";
import { parseChurchSlug } from "@/lib/churchSlug";

type ListenPhonePageProps = {
  params: Promise<{ church: string }>;
};

export default async function ListenPhonePage({ params }: ListenPhonePageProps) {
  const { church } = await params;
  const slug = parseChurchSlug(church);
  const record = slug ? await getActiveChurchBySlug(slug) : null;

  return (
    <TranslationListenPage
      churchSlug={church}
      churchName={record?.name}
      line="phone"
    />
  );
}
