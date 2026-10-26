import { PvcccPublicChrome } from "@/components/PvcccPublicChrome";
import { getPublicPageOrigin } from "@/lib/publicPageOrigin";
import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "同工操作 · 平安谷 PVCCC",
  description:
    "Sunday setup for the Peace Valley live translation operator. Listeners use the QR code page.",
};

const STEPS: Array<{ chinese: string; english: string; showLoginUrl?: boolean }> = [
  {
    chinese: "打开 Google Chrome 或 Microsoft Edge。不要使用 Firefox。",
    english: "Open Google Chrome or Microsoft Edge. Do not use Firefox.",
  },
  {
    chinese: "打开登录页，用本教会操作员的邮箱和密码登录：",
    english: "Open the sign-in page and sign in with this church’s operator email and password:",
    showLoginUrl: true,
  },
  {
    chinese: "确认电脑的音频输出已经接到耳机发射器，接收器已开机。",
    english: "Confirm the computer audio out is connected to the headset transmitter, and the receivers are on.",
  },
  {
    chinese: "翻译方向一般选 Auto。音频输入选讲台的 Streaming。音频输出选接到发射器的那个接口。",
    english: "Leave Translation direction on Auto. For Audio in, choose Streaming from the pulpit. For Audio out, choose the output that feeds the transmitter.",
  },
  {
    chinese: "点 Start translation，等到状态变成 Live。电平条应该会动，耳机里应能听到翻译。",
    english: "Click Start translation and wait until the status says Live. The level meters should move, and headsets should hear the translation.",
  },
  {
    chinese: "请会众打开听众二维码页，扫描「听翻译」「看翻译」或「看原文」。听的人要等到 LIVE，再点 Tap to Listen。",
    english: "Ask people to open the listener QR page and scan Hear, Read the translation, or Read what was spoken. Listeners wait for LIVE, then tap Tap to Listen.",
  },
  {
    chinese: "敬拜结束后，点 Stop translation。",
    english: "After the service, click Stop translation.",
  },
];

export default async function PvcccOperatorPage() {
  const loginUrl = `${await getPublicPageOrigin()}/login`;

  return (
    <PvcccPublicChrome title="同工操作" englishTitle="Operator setup">
      <section className="space-y-3 text-base leading-relaxed" lang="zh-Hans">
        <h2 className="text-2xl font-bold text-[#045888]">主日开始前</h2>
        <p>
          这一页给开启实时翻译的同工。一位同工在教会电脑上操作即可，不需要口译员。会众用另一页上的二维码，在自己的手机上收听或阅读。
        </p>
      </section>

      <section className="space-y-3 text-base leading-relaxed" lang="en">
        <h2 className="text-2xl font-bold text-[#045888]">Before worship</h2>
        <p>
          This page is for the volunteer who starts live translation. One person
          runs it on the church computer. No interpreter is required. The
          congregation uses the QR codes on a separate page to listen or read
          on their own phones.
        </p>
      </section>

      <section aria-labelledby="setup-heading">
        <h2 id="setup-heading" className="text-2xl font-bold text-[#045888]">
          设置与操作 Setup
        </h2>
        <ol className="mt-4 space-y-4">
          {STEPS.map((step, index) => (
            <li
              key={step.english}
              className="rounded-2xl bg-white px-5 py-4 ring-1 ring-[#d3e4f0]"
            >
              <p className="text-sm font-bold text-[#046eab]">{index + 1}</p>
              <p className="mt-1 text-base leading-relaxed" lang="zh-Hans">
                {step.chinese}
              </p>
              <p className="mt-1 text-base leading-relaxed" lang="en">
                {step.english}
              </p>
              {step.showLoginUrl ? (
                <p className="mt-2 break-all text-base leading-relaxed">
                  <a
                    href={loginUrl}
                    className="font-semibold text-[#046eab] hover:underline"
                  >
                    {loginUrl}
                  </a>
                </p>
              ) : null}
            </li>
          ))}
        </ol>
      </section>

      <div className="grid gap-3 sm:grid-cols-2">
        <Link
          href="/login"
          className="flex min-h-14 flex-wrap items-center justify-center gap-x-2 rounded-2xl bg-[#046eab] px-5 py-4 text-center text-lg font-bold text-white hover:bg-[#045888]"
        >
          登录并开始
          <span aria-hidden="true" className="mx-2 font-normal">
            ·
          </span>
          Sign in
        </Link>
        <Link
          href="/pvccc"
          className="flex min-h-14 flex-wrap items-center justify-center gap-x-2 rounded-2xl bg-white px-5 py-4 text-center text-lg font-bold text-[#045888] ring-1 ring-[#046eab] hover:bg-[#e7f5fd]"
        >
          会众二维码
          <span aria-hidden="true" className="mx-2 font-normal">
            ·
          </span>
          Listener QR codes
        </Link>
      </div>
    </PvcccPublicChrome>
  );
}
