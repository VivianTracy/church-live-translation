# 操作员日常使用 / Operator daily use

每周主日打开耳机翻译用这份说明。第一次安装请看 [`README.md`](./README.md)。

Use this sheet each Sunday to start headset translation. For first-time install, see [`README.md`](./README.md).

请使用 **Google Chrome** 或 **Microsoft Edge**。不要使用 Firefox。

Use **Google Chrome** or **Microsoft Edge**. Do not use Firefox.

---

## 中文

### 1. 打开终端窗口

翻译程序需要一个一直开着的窗口。关掉这个窗口，翻译就会停止。

**苹果电脑 Mac**

1. 按键盘 **Command (⌘) + 空格键**（或点击屏幕右上角的放大镜）。
2. 输入 `Terminal` 或「终端」。
3. 按 Return。会出现一个白色或黑色的文字窗口。

**Windows 电脑**

1. 点击屏幕左下角的 **开始** 按钮。
2. 输入 `cmd`，打开 **命令提示符**；或输入 `powershell`，打开 **Windows PowerShell**。
3. 两种都可以。

### 2. 进入项目文件夹

每次都要先进入 `church-live-translation` 这个文件夹。

**苹果电脑 Mac**

1. 在终端里输入 `cd `（cd 后面有一个空格，先不要按 Return）。
2. 打开 Finder，找到 `church-live-translation` 文件夹。
3. 把这个文件夹拖进终端窗口。路径会自动填上。
4. 按 Return。

**Windows 电脑**

1. 打开 **文件资源管理器**，进入 `church-live-translation` 文件夹。
2. 点击上方地址栏，复制路径（Ctrl + C）。
3. 回到命令窗口，输入 `cd /d `（后面有一个空格），然后按 Ctrl + V 粘贴，再按 Enter。

如果已经在正确文件夹里，输入 `pwd`（Mac）或 `cd`（Windows）可以确认。

### 3. 启动翻译网页

在终端里输入：

```bash
npm run start
```

按 Return / Enter。

等大约几秒。Chrome（或 Edge）会自动打开操作页。

**请让终端窗口开着。** 不要关掉，也不要按 Ctrl + C，直到敬拜结束。

如果浏览器没有打开，可手动打开 Chrome，访问：http://localhost:3000/operator-live

**第一次使用，或刚刚更新过程序**，先运行：

```bash
npm run build
npm run start
```

平时主日只需要 `npm run start`。

### 4. 在网页上开始翻译

确认 3.5 mm 线已从电脑音频输出口接到 TT125 发射器的 **MIC** 口。耳机接收器打开。

1. **翻译方向** — 一般选 Auto。也可以锁定「中文 → 英文」或「英文 → 中文」。
2. **音频输入 Audio in** — 讲台音频选 Streaming（ClearClick / X32 / BlackHole / VB-Cable）；用麦克风则选 Microphone。第一次点 **Allow access & refresh** 允许麦克风权限。
3. **音频输出 Audio out** — 选接到 TT125 的那个输出口（耳机孔或 USB 声卡）。
4. 点 **Start translation**（开始翻译）。等到状态变成 **Live**。

输入和输出电平条应该会动。会众耳机里应能听到翻译。

手机收听：屏幕上的二维码是固定的（`https://church-caption.vercel.app/listen`）。会众扫码后，等页面显示 **LIVE**，再点 **Tap to Listen**。手机可以用自己的流量，不必连教会 Wi‑Fi。iPhone 必须先点一下才能出声。

如果状态变成 **Failed**，点 **Reconnect**。程序也会在网络短暂断开时自动重试两次。

长休息时点 **Stop translation**，以节省费用。讲道开始再重新打开。

### 5. 敬拜结束后

1. 网页上点 **Stop translation**。
2. 回到终端窗口，按 **Ctrl + C** 停止程序。
3. 可以关掉终端。

### 常见问题

| 情况 | 处理 |
|---|---|
| 终端提示找不到文件夹 | 还没进入 `church-live-translation`。按上面第 2 步再试。 |
| 提示 `OPENAI_API_KEY` | 请同工确认项目根目录有 `.env.local`，并且里面有密钥。改完后重新 `npm run start`。 |
| 浏览器没打开 | 用 Chrome 打开 http://localhost:3000/operator-live |
| 输入列表是空的 | 点 **Allow access & refresh**，并允许 Chrome 使用麦克风。 |
| 耳机没声音 | 确认 Audio out 选对了，线插在 TT125 的 MIC 口，接收器已开机。 |
| 画面显示 Failed | 点 **Reconnect**。若仍失败，检查网络和 `.env.local` 里的密钥。 |
| Auto 方向不对 | 先停翻译，再选固定方向（中文 → 英文，或英文 → 中文），然后重新开始。 |
| 手机一直 WAITING | 先确认电脑上已经 Live。若耳机有声音、手机没有，请同工检查 Vercel / Redis（见安装说明）。 |
| 手机没声音 | 等 LIVE 后再点 **Tap to Listen**。建议戴耳机。 |

---

## English

### 1. Open the terminal window

The app needs a window that stays open. Closing it stops translation.

**Mac**

1. Press **Command (⌘) + Space** (or click the magnifying glass in the top-right).
2. Type `Terminal`.
3. Press Return. A text window opens.

**Windows**

1. Click **Start**.
2. Type `cmd` and open **Command Prompt**, or type `powershell` and open **Windows PowerShell**.
3. Either one works.

### 2. Go to the project folder

You must be inside the `church-live-translation` folder.

**Mac**

1. In Terminal, type `cd ` (that is c-d, then a space — do not press Return yet).
2. Open Finder and find the `church-live-translation` folder.
3. Drag that folder onto the Terminal window. The path fills in.
4. Press Return.

**Windows**

1. Open **File Explorer** and go to the `church-live-translation` folder.
2. Click the address bar and copy the path (Ctrl + C).
3. In the command window, type `cd /d ` (with a space), paste with Ctrl + V, then press Enter.

### 3. Start the operator page

Type:

```bash
npm run start
```

Press Return / Enter.

Wait a few seconds. Chrome (or Edge) should open the operator page by itself.

**Leave the terminal window open.** Do not close it, and do not press Ctrl + C, until the service is over.

If the browser does not open, open Chrome and go to: http://localhost:3000/operator-live

**First time, or after a software update**, run this first:

```bash
npm run build
npm run start
```

On a normal Sunday, `npm run start` is enough.

### 4. Start translation in the browser

Confirm a 3.5 mm cable runs from the PC audio out to the TT125 transmitter **MIC** port. Turn on the headset receivers.

1. **Translation direction** — Auto is fine for most services. Or lock Chinese → English / English → Chinese.
2. **Audio in** — Streaming for the pulpit feed (ClearClick / X32 / BlackHole / VB-Cable), or Microphone for a room mic. On the first visit, click **Allow access & refresh** and allow the microphone prompt.
3. **Audio out** — the jack or USB dongle that feeds the TT125.
4. Click **Start translation**. Wait until the status says **Live**.

The level meters should move. Headsets should hear the translation.

Phone listeners: the QR on the page stays the same (`https://church-caption.vercel.app/listen`). People scan it, wait until the page says **LIVE**, then tap **Tap to Listen**. Phones can use mobile data. iPhones need that tap before sound plays.

If the status says **Failed**, click **Reconnect**. The app also retries twice by itself if the network drops briefly.

During a long break, click **Stop translation** to save cost. Start again when preaching resumes.

### 5. After the service

1. On the page, click **Stop translation**.
2. Click the terminal window and press **Ctrl + C**.
3. You can close the terminal.

### If something goes wrong

| Problem | What to try |
|---|---|
| Folder not found | You are not in `church-live-translation`. Repeat step 2. |
| `OPENAI_API_KEY` error | Ask a teammate to check `.env.local` in the project folder. Restart with `npm run start` after editing. |
| Browser did not open | Open Chrome to http://localhost:3000/operator-live |
| Empty input list | Click **Allow access & refresh** and allow Chrome microphone access. |
| Silent headsets | Check Audio out, the cable on the TT125 **MIC** port, and that receivers are on. |
| Status says Failed | Click **Reconnect**. If it still fails, check the network and the API key in `.env.local`. |
| Auto picked the wrong direction | Stop translation, lock Chinese → English or English → Chinese, then start again. |
| Phone stays on WAITING | Confirm the computer is Live. If headsets work but phones do not, a teammate should check Vercel / Redis in the install guide. |
| Phone is silent | Wait for LIVE, then tap **Tap to Listen**. Headphones help. |
