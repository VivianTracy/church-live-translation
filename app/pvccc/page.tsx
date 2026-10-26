import { PvcccPublicChrome } from "@/components/PvcccPublicChrome";
import { PvcccQrCard } from "@/components/PvcccQrCard";
import {
  getTranslationCaptionUrl,
  getTranslationListenUrl,
} from "@/lib/audienceUrl";
import { getPublicPageOrigin } from "@/lib/publicPageOrigin";
import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "手机收听 · 平安谷 PVCCC",
  description:
    "Scan a QR code to hear or read live Chinese and English translation at Peace Valley Chinese Christian Church.",
};

export default async function PvcccListenerPage() {
  const origin = await getPublicPageOrigin();
  const listenUrl = getTranslationListenUrl(origin, "pvccc");
  const translationCaptionUrl = getTranslationCaptionUrl(
    origin,
    "pvccc",
    "translation"
  );
  const originalCaptionUrl = getTranslationCaptionUrl(origin, "pvccc", "original");

  return (
    <PvcccPublicChrome title="手机收听" englishTitle="Listen on your phone">
      <section className="space-y-3 text-base leading-relaxed" lang="zh-Hans">
        <h2 className="text-2xl font-bold text-[#045888]">用二维码收听或阅读</h2>
        <p>
          主日崇拜时，讲道会实时翻译成中文或英文。请用手机相机扫描下面的二维码。不必登录，也可以用自己的手机流量，不必连接教会
          Wi-Fi。
        </p>
        <p>翻译开始之前，页面会显示等待。开始之后，听的页面会显示 LIVE。</p>
      </section>

      <section className="space-y-3 text-base leading-relaxed" lang="en">
        <h2 className="text-2xl font-bold text-[#045888]">
          Use a QR code to listen or read
        </h2>
        <p>
          During Sunday worship, the sermon is translated between Chinese and
          English. Scan a code below with your phone camera. You do not sign
          in, and mobile data works. You do not need the church Wi-Fi.
        </p>
        <p>
          Before translation starts, the page waits. When it starts, the listen
          page says LIVE.
        </p>
      </section>

      <ol className="grid gap-3 sm:grid-cols-3">
        {[
          ["打开相机", "Open the camera"],
          ["对准二维码", "Point at the code"],
          ["点开出现的链接", "Tap the link that appears"],
        ].map(([chinese, english], index) => (
          <li
            key={english}
            className="rounded-2xl bg-white px-4 py-4 text-center ring-1 ring-[#d3e4f0]"
          >
            <p className="text-sm font-bold text-[#046eab]">{index + 1}</p>
            <p className="mt-1 font-semibold" lang="zh-Hans">
              {chinese}
            </p>
            <p lang="en">{english}</p>
          </li>
        ))}
      </ol>

      <PvcccQrCard
        url={listenUrl}
        title="听翻译"
        englishTitle="Hear the translation"
        detail="打开后等到 LIVE，再点 Tap to Listen。iPhone 必须先点一下才会出声。建议戴耳机。"
        englishDetail="Wait until the page says LIVE, then tap Tap to Listen. An iPhone stays silent until that tap. Headphones help."
        prominent
      />

      <div className="grid gap-6 sm:grid-cols-2">
        <PvcccQrCard
          url={translationCaptionUrl}
          title="看翻译"
          englishTitle="Read the translation"
          detail="给需要阅读翻译的人。耳机仍会继续播放。"
          englishDetail="For anyone who needs to read the translation. Headsets keep playing."
        />
        <PvcccQrCard
          url={originalCaptionUrl}
          title="看原文"
          englishTitle="Read what was spoken"
          detail="讲员正在说的语言，方便对照或帮助听力。"
          englishDetail="The language being spoken, for anyone following along or who needs help hearing."
        />
      </div>

      <p className="text-center text-sm text-[#3d5166]">
        如果本页已经在您的手机上，直接点蓝色按钮即可。
        <span lang="en"> If this page is already on your phone, tap the blue button.</span>
      </p>

      <p className="text-center text-sm">
        <Link href="/pvccc/operator" className="font-medium text-[#045888] hover:underline">
          同工操作说明 Operator setup
        </Link>
      </p>
    </PvcccPublicChrome>
  );
}
