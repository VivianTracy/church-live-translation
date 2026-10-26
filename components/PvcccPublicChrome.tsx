import type { ReactNode } from "react";

const pageFont =
  '"PingFang SC", "Hiragino Sans GB", "Noto Sans SC", "Microsoft YaHei", var(--font-geist-sans), sans-serif';

type PvcccPublicChromeProps = {
  title: string;
  englishTitle: string;
  children: ReactNode;
};

export function PvcccPublicChrome({
  title,
  englishTitle,
  children,
}: PvcccPublicChromeProps) {
  return (
    <div
      className="min-h-screen bg-[#f4f9fc] text-[#243140]"
      style={{ fontFamily: pageFont }}
    >
      <header className="bg-[#045888] text-white">
        <div className="mx-auto max-w-3xl px-5 py-10 text-center sm:py-14">
          <p className="text-sm font-semibold tracking-wide text-[#c5e6fb]">
            <a href="https://www.pvccc.org/" className="hover:underline">
              平安谷华人基督教会
            </a>
            <span aria-hidden="true"> · </span>
            <a href="https://www.pvccc.org/" className="hover:underline">
              Peace Valley Chinese Christian Church
            </a>
          </p>
          <h1 className="mt-3 text-4xl font-bold tracking-tight sm:text-5xl">
            {title}
          </h1>
          <p className="mt-2 text-2xl text-[#d7eefc]">{englishTitle}</p>
        </div>
      </header>

      <main className="mx-auto max-w-3xl space-y-8 px-5 py-8 sm:py-10">
        {children}
      </main>

      <footer className="border-t border-[#d3e4f0] bg-white">
        <div className="mx-auto max-w-3xl space-y-2 px-5 py-8 text-sm text-[#3d5166]">
          <p className="font-semibold text-[#045888]">和我们一起敬拜 Worship with us</p>
          <p>主日崇拜 Sunday worship · 10:00–11:30 AM</p>
          <p>
            <a
              href="https://maps.google.com/?q=565+Virginia+Drive,+Fort+Washington,+PA+19034"
              className="font-medium text-[#045888] hover:underline"
            >
              565 Virginia Drive, Fort Washington, PA 19034
            </a>
          </p>
          <p>
            <a href="tel:+12677190123" className="font-medium text-[#045888] hover:underline">
              (267) 719-0123
            </a>
          </p>
        </div>
      </footer>
    </div>
  );
}
