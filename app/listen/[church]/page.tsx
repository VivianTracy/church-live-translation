import { TranslationListenPage } from "@/components/TranslationListenPage";
import { getActiveChurchBySlug } from "@/lib/churchListen";
import { parseChurchSlug } from "@/lib/churchSlug";

type ListenChurchPageProps = {
  params: Promise<{ church: string }>;
};

export default async function ListenChurchPage({
  params,
}: ListenChurchPageProps) {
  const { church } = await params;
  const slug = parseChurchSlug(church);
  const record = slug ? await getActiveChurchBySlug(slug) : null;

  return (
    <TranslationListenPage
      churchSlug={church}
      churchName={record?.name}
    />
  );
}
