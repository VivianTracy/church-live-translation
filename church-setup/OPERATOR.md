# 操作员日常使用 / Operator daily use

每周主日打开耳机翻译用这份说明。第一次安装请看 [`README.md`](./README.md)。

Use this sheet each Sunday to start headset translation. For first-time install, see [`README.md`](./README.md).

请使用 **Google Chrome** 或 **Microsoft Edge**。不要使用 Firefox。

Use **Google Chrome** or **Microsoft Edge**. Do not use Firefox.

---

## 中文

### 1. 打开翻译网页并登录

1. 打开 **Google Chrome** 或 **Microsoft Edge**。
2. 打开 `https://church-translate.vercel.app/login`。
3. 用本教会操作员的邮箱和密码登录。
4. 登录后会进入操作页。

手机听众不用登录。他们扫描操作员屏幕上的二维码，打开本教会的收听页（例如 `/listen/pvccc`）。

如果网站打不开，再用下面的「本机启动」备用步骤。

### 2. 在网页上开始翻译

确认 3.5 mm 线已从电脑音频输出口接到 TT125 发射器的 **MIC** 口。耳机接收器打开。

1. **翻译方向** — 一般选 Auto。也可以锁定「中文 → 英文」或「英文 → 中文」。
2. **音频输入 Audio in** — 讲台音频选 Streaming（ClearClick / X32 / BlackHole / VB-Cable）；用麦克风则选 Microphone。第一次点 **Allow access & refresh** 允许麦克风权限。
3. **音频输出 Audio out** — 选接到 TT125 的那个输出口（耳机孔或 USB 声卡）。
4. 点 **Start translation**（开始翻译）。等到状态变成 **Live**。

输入和输出电平条应该会动。会众耳机里应能听到翻译。

手机收听：屏幕上的二维码是本教会专用的（例如 `https://church-caption.vercel.app/listen/pvccc`）。会众扫码后，等页面显示 **LIVE**，再点 **Tap to Listen**。手机可以用自己的流量，不必连教会 Wi‑Fi。iPhone 必须先点一下才能出声。

如果状态变成 **Failed**，点 **Reconnect**。程序也会在网络短暂断开时自动重试两次。

长休息时点 **Stop translation**，以节省费用。讲道开始再重新打开。

### 3. 敬拜结束后

1. 网页上点 **Stop translation**。
2. 可以点 **Sign out**。

### 本机启动（备用）

只有网站不能用、又必须在这台电脑跑程序时才用。先进入 `church-live-translation` 文件夹，再运行 `npm run start`。浏览器打开后仍要登录。

### 常见问题

| 情况 | 处理 |
|---|---|
| 打不开登录页 | 检查网络。请同工确认 Vercel 网站已部署。 |
| 提示不是操作员 | 请同工在 Supabase 里确认这个邮箱已经加入本教会。 |
| 提示 `OPENAI_API_KEY` | 本机备用模式才需要 `.env.local` 里的密钥。公开网站用的是教会加密密钥。 |
| 输入列表是空的 | 点 **Allow access & refresh**，并允许 Chrome 使用麦克风。 |
| 耳机没声音 | 确认 Audio out 选对了，线插在 TT125 的 MIC 口，接收器已开机。 |
| 画面显示 Failed | 点 **Reconnect**。若仍失败，检查网络，并确认已经登录。 |
| Auto 方向不对 | 先停翻译，再选固定方向（中文 → 英文，或英文 → 中文），然后重新开始。 |
| 手机一直 WAITING | 先确认电脑上已经 Live。若耳机有声音、手机没有，请同工检查 Vercel / Redis（见安装说明）。 |
| 手机没声音 | 等 LIVE 后再点 **Tap to Listen**。建议戴耳机。 |

---

## English

### 1. Open the site and sign in

1. Open **Google Chrome** or **Microsoft Edge**.
2. Go to `https://church-translate.vercel.app/login`.
3. Sign in with this church’s operator email and password.
4. You should land on the operator page.

Phone listeners do not sign in. They scan the QR on the operator screen, which opens this church’s listen page (for example `/listen/pvccc`).

If the website is down, use the local backup steps below.

### 2. Start translation in the browser

Confirm a 3.5 mm cable runs from the PC audio out to the TT125 transmitter **MIC** port. Turn on the headset receivers.

1. **Translation direction** — Auto is fine for most services. Or lock Chinese → English / English → Chinese.
2. **Audio in** — Streaming for the pulpit feed (ClearClick / X32 / BlackHole / VB-Cable), or Microphone for a room mic. On the first visit, click **Allow access & refresh** and allow the microphone prompt.
3. **Audio out** — the jack or USB dongle that feeds the TT125.
4. Click **Start translation**. Wait until the status says **Live**.

The level meters should move. Headsets should hear the translation.

Phone listeners: the QR on the page is for this church (for example `https://church-caption.vercel.app/listen/pvccc`). People scan it, wait until the page says **LIVE**, then tap **Tap to Listen**. Phones can use mobile data. iPhones need that tap before sound plays.

If the status says **Failed**, click **Reconnect**. The app also retries twice by itself if the network drops briefly.

During a long break, click **Stop translation** to save cost. Start again when preaching resumes.

### 3. After the service

1. On the page, click **Stop translation**.
2. You can click **Sign out**.

### Local backup

Use this only if the website is down and you must run the app on this computer. Open the `church-live-translation` folder, then run `npm run start`. Sign in after the browser opens.

### If something goes wrong

| Problem | What to try |
|---|---|
| Login page will not load | Check the network. Ask a teammate to confirm the Vercel site is deployed. |
| Not an authorized operator | Ask a teammate to add this email to the church in Supabase. |
| `OPENAI_API_KEY` error | The local backup still uses `.env.local`. The public site uses the church’s encrypted key. |
| Empty input list | Click **Allow access & refresh** and allow Chrome microphone access. |
| Silent headsets | Check Audio out, the cable on the TT125 **MIC** port, and that receivers are on. |
| Status says Failed | Click **Reconnect**. If it still fails, check the network and confirm you are signed in. |
| Auto picked the wrong direction | Stop translation, lock Chinese → English or English → Chinese, then start again. |
| Phone stays on WAITING | Confirm the computer is Live. If headsets work but phones do not, a teammate should check Vercel / Redis in the install guide. |
| Phone is silent | Wait for LIVE, then tap **Tap to Listen**. Headphones help. |
