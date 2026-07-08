import { redirect } from "next/navigation";

type OperatorOpenAIRedirectPageProps = {
  searchParams: Promise<{ test?: string }>;
};

export default async function OperatorOpenAIRedirectPage({
  searchParams,
}: OperatorOpenAIRedirectPageProps) {
  const params = await searchParams;
  const query = params.test === "1" ? "?test=1" : "";
  redirect(`/operator-caption${query}`);
}
