import { LiveUrlQrCode } from "@/components/LiveUrlQrCode";

type PvcccQrCardProps = {
  url: string;
  title: string;
  englishTitle: string;
  detail: string;
  englishDetail: string;
  prominent?: boolean;
};

export function PvcccQrCard({
  url,
  title,
  englishTitle,
  detail,
  englishDetail,
  prominent = false,
}: PvcccQrCardProps) {
  return (
    <article className="rounded-3xl bg-white p-6 text-center shadow-sm ring-1 ring-[#d3e4f0]">
      <h2 className="text-2xl font-bold text-[#045888]">{title}</h2>
      <p className="mt-1 text-lg font-semibold text-[#243140]">{englishTitle}</p>
      <p className="mt-3 text-base leading-relaxed text-[#3d5166]" lang="zh-Hans">
        {detail}
      </p>
      <p className="mt-1 text-base leading-relaxed text-[#3d5166]" lang="en">
        {englishDetail}
      </p>

      <div className="mt-5">
        <LiveUrlQrCode url={url} size={prominent ? 220 : 180} />
      </div>

      <a
        href={url}
        aria-label={`${title} ${englishTitle}. 在这台手机上打开 Open on this phone`}
        className="mt-5 flex min-h-14 w-full flex-wrap items-center justify-center gap-x-2 rounded-2xl bg-[#046eab] px-5 py-4 text-center text-lg font-bold text-white hover:bg-[#045888]"
      >
        <span lang="zh-Hans">在这台手机上打开</span>
        <span className="font-normal" aria-hidden="true">
          ·
        </span>
        <span lang="en">Open on this phone</span>
      </a>

      <p className="mt-3 break-all text-sm text-[#045888]">
        <a href={url} className="font-medium hover:underline">
          {url}
        </a>
      </p>
    </article>
  );
}
