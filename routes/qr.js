const { 
    giftedId,
    removeFile
} = require('../gift');
const { SESSION_PREFIX, GC_JID, BOT_REPO, WA_CHANNEL, MSG_FOOTER } = require('../config');
const { isConfigured, saveSession } = require('../gift/sessionStore');
const QRCode = require('qrcode');
const express = require('express');
const zlib = require('zlib');
const path = require('path');
const fs = require('fs');
let router = express.Router();
const pino = require("pino");
const { sendButtons } = require('gifted-btns');
const {
    default: giftedConnect,
    useMultiFileAuthState,
    Browsers,
    delay,
    fetchLatestBaileysVersion
} = require("@whiskeysockets/baileys");

const sessionDir = path.join(__dirname, "session");

router.get('/session', async (req, res) => {
    const id = giftedId();
    const sessionType = (req.query.type || 'short').toLowerCase();
    let responseSent = false;
    let sessionCleanedUp = false;

    async function cleanUpSession() {
        if (!sessionCleanedUp) {
            await removeFile(path.join(sessionDir, id));
            sessionCleanedUp = true;
        }
    }

    async function GIFTED_QR_CODE() {
        const { version } = await fetchLatestBaileysVersion();
       // console.log(version);
        const { state, saveCreds } = await useMultiFileAuthState(path.join(sessionDir, id));
        try {
            let Gifted = giftedConnect({
                version,
                auth: state,
                printQRInTerminal: false,
                logger: pino({ level: "silent" }),
                browser: Browsers.macOS("Desktop"),
                connectTimeoutMs: 60000,
                keepAliveIntervalMs: 30000
            });

            Gifted.ev.on('creds.update', saveCreds);
            Gifted.ev.on("connection.update", async (s) => {
                const { connection, lastDisconnect, qr } = s;

                if (qr && !responseSent) {
                    const qrImage = await QRCode.toDataURL(qr);
                    if (!res.headersSent) {
                        res.send(`
<!DOCTYPE html>
<html>
<head>
    <title>LUKA-AI | QR CODE</title>

    <meta name="viewport"
          content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">

    <style>
        :root {
            --bg: #20242b;
            --surface: #20242b;
            --text: #f1f3f6;
            --muted: #9299a6;

            --purple: #9b6cff;
            --purple-dark: #b18cff;

            --shadow-dark: #15181d;
            --shadow-light: #2b3038;
        }

        * {
            box-sizing: border-box;
        }

        body {
            display: flex;
            justify-content: center;
            align-items: center;

            min-height: 100vh;

            margin: 0;
            padding: 25px 18px;

            background: var(--bg);

            font-family: Arial, sans-serif;

            color: var(--text);

            text-align: center;
        }

        .container {
            width: 100%;
            max-width: 430px;

            padding: 32px 25px;

            background: var(--surface);

            border-radius: 35px;

            box-shadow:
                14px 14px 30px var(--shadow-dark),
                -14px -14px 30px var(--shadow-light);
        }

        /* BRAND */

        .brand {
            width: 75px;
            height: 75px;

            margin: 0 auto 18px;

            border-radius: 24px;

            background: var(--surface);

            display: flex;
            align-items: center;
            justify-content: center;

            box-shadow:
                8px 8px 18px var(--shadow-dark),
                -8px -8px 18px var(--shadow-light);

            color: var(--purple);

            font-size: 28px;
            font-weight: 900;
        }

        h1 {
            margin: 0;

            color: var(--text);

            font-size: 25px;
            font-weight: 800;

            letter-spacing: 0.5px;
        }

        .subtitle {
            margin: 9px 0 25px;

            color: var(--muted);

            font-size: 14px;

            line-height: 1.5;
        }

        /* STATUS */

        .status {
            display: inline-flex;

            align-items: center;

            gap: 8px;

            padding: 10px 18px;

            margin-bottom: 17px;

            border-radius: 20px;

            background: var(--surface);

            color: var(--purple);

            font-size: 13px;

            font-weight: 700;

            box-shadow:
                5px 5px 12px var(--shadow-dark),
                -5px -5px 12px var(--shadow-light);
        }

        .status-dot {
            width: 8px;
            height: 8px;

            border-radius: 50%;

            background: var(--purple);

            box-shadow:
                0 0 8px rgba(155, 108, 255, 0.75);
        }

        /* QR AREA */

        .qr-container {
            position: relative;

            width: 310px;
            height: 310px;

            margin: 0 auto 22px;

            display: flex;

            justify-content: center;
            align-items: center;

            border-radius: 32px;

            background: var(--surface);

            box-shadow:
                inset 9px 9px 20px var(--shadow-dark),
                inset -9px -9px 20px var(--shadow-light);
        }

        .qr-code {
            width: 250px;
            height: 250px;

            padding: 14px;

            background: #ffffff;

            border-radius: 25px;

            display: flex;

            align-items: center;
            justify-content: center;

            box-shadow:
                8px 8px 18px rgba(0, 0, 0, 0.45),
                -8px -8px 18px rgba(55, 61, 72, 0.65);
        }

        .qr-code img {
            width: 100%;
            height: 100%;

            display: block;

            border-radius: 10px;
        }

        /* QR PULSE */

        .pulse {
            animation: softPulse 2.5s infinite ease-in-out;
        }

        @keyframes softPulse {

            0%,
            100% {
                box-shadow:
                    8px 8px 18px rgba(0, 0, 0, 0.45),
                    -8px -8px 18px rgba(55, 61, 72, 0.65);
            }

            50% {
                box-shadow:
                    8px 8px 22px rgba(0, 0, 0, 0.5),
                    -8px -8px 22px rgba(55, 61, 72, 0.75),
                    0 0 28px rgba(155, 108, 255, 0.22);
            }
        }

        /* DESCRIPTION */

        p {
            color: var(--muted);

            margin: 0 0 20px;

            font-size: 14px;

            line-height: 1.5;
        }

        /* BACK BUTTON */

        .back-btn {
            display: inline-flex;

            align-items: center;
            justify-content: center;

            min-width: 130px;

            padding: 13px 25px;

            background: var(--surface);

            color: var(--purple);

            text-decoration: none;

            border-radius: 18px;

            font-size: 14px;

            font-weight: 800;

            transition: all 0.2s ease;

            box-shadow:
                7px 7px 15px var(--shadow-dark),
                -7px -7px 15px var(--shadow-light);
        }

        .back-btn:hover {
            color: var(--purple-dark);

            transform: translateY(-2px);
        }

        .back-btn:active {
            transform: translateY(2px);

            box-shadow:
                inset 5px 5px 10px var(--shadow-dark),
                inset -5px -5px 10px var(--shadow-light);
        }

        /* INFO BOX */

        .info-box {
            margin-bottom: 20px;

            padding: 13px 15px;

            border-radius: 18px;

            background: var(--surface);

            display: flex;

            align-items: flex-start;

            gap: 10px;

            text-align: left;

            color: var(--muted);

            box-shadow:
                inset 5px 5px 10px var(--shadow-dark),
                inset -5px -5px 10px var(--shadow-light);
        }

        .info-icon {
            color: var(--purple);

            font-size: 16px;

            flex-shrink: 0;
        }

        .info-text {
            margin: 0;

            font-size: 12px;

            line-height: 1.5;
        }

        .info-text strong {
            color: var(--purple);
        }

        /* MOBILE */

        @media (max-width: 480px) {

            body {
                padding: 18px 12px;
            }

            .container {
                padding: 27px 18px;

                border-radius: 30px;
            }

            .brand {
                width: 68px;
                height: 68px;

                border-radius: 21px;

                font-size: 25px;
            }

            h1 {
                font-size: 23px;
            }

            .qr-container {
                width: 280px;
                height: 280px;

                border-radius: 28px;
            }

            .qr-code {
                width: 225px;
                height: 225px;

                padding: 12px;
            }
        }

        @media (max-width: 340px) {

            .qr-container {
                width: 245px;
                height: 245px;
            }

            .qr-code {
                width: 195px;
                height: 195px;
            }
        }
    </style>
</head>

<body>

    <div class="container">

        <div class="brand">
            LA
        </div>

        ${(sessionType === 'short' && !isConfigured()) ? `
        <div class="info-box">

            <span class="info-icon">
                ℹ️
            </span>

            <p class="info-text">
                Session store is not configured &mdash;
                automatically switched to
                <strong>Long session</strong>.
            </p>

        </div>
        ` : ''}

        <h1>
            LUKA-AI QR CODE
        </h1>

        <div class="subtitle">
            Scan this QR code with your phone to connect
        </div>

        <div class="status">

            <span class="status-dot"></span>

            Waiting for scan

        </div>

        <div class="qr-container">

            <div class="qr-code pulse">

                <img
                    src="${qrImage}"
                    alt="LUKA-AI QR Code"
                />

            </div>

        </div>

        <p>
            Open WhatsApp → Linked Devices → Link a Device
        </p>

        <a
            href="./"
            class="back-btn">
            ← Back
        </a>

    </div>

    <script>

        const backButton =
            document.querySelector('.back-btn');

        backButton.addEventListener(
            'mousedown',
            function () {

                this.style.transform =
                    'translateY(2px)';

            }
        );

        backButton.addEventListener(
            'mouseup',
            function () {

                this.style.transform =
                    'translateY(-2px)';

            }
        );

    </script>

</body>
</html>
                        `);
                        responseSent = true;
                    }
                }

                if (connection === "open") {
                    try {
                        await Gifted.groupAcceptInvite(GC_JID);
                    } catch (e) {
                        console.log("Group join error:", e.message);
                    }

                    await delay(10000);

                    let sessionData = null;
                    let attempts = 0;
                    const maxAttempts = 10;

                    while (attempts < maxAttempts && !sessionData) {
                        try {
                            const credsPath = path.join(sessionDir, id, "creds.json");
                            if (fs.existsSync(credsPath)) {
                                const data = fs.readFileSync(credsPath);
                                if (data && data.length > 100) {
                                    sessionData = data;
                                    break;
                                }
                            }
                            await delay(2000);
                            attempts++;
                        } catch (readError) {
                            console.error("Read error:", readError);
                            await delay(2000);
                            attempts++;
                        }
                    }

                    if (!sessionData) {
                        await cleanUpSession();
                        return;
                    }

                    try {
                        let compressedData = zlib.gzipSync(sessionData);
                        let b64data = compressedData.toString('base64');
                        const fullSession = SESSION_PREFIX + b64data;

                        let msgText, msgButtons;
                        if (isConfigured() && sessionType === 'short') {
                            const shortId = await saveSession(fullSession);
                            const shortSession = `${SESSION_PREFIX}${shortId}`;
                            msgText = `*SESSION ID ✅*\n\n${shortSession}`;
                            msgButtons = [
                                { name: 'cta_copy', buttonParamsJson: JSON.stringify({ display_text: 'Copy Session', copy_code: shortSession }) },
                                { name: 'cta_url', buttonParamsJson: JSON.stringify({ display_text: 'Visit Bot Repo', url: BOT_REPO }) },
                                { name: 'cta_url', buttonParamsJson: JSON.stringify({ display_text: 'Join WaChannel', url: WA_CHANNEL }) }
                            ];
                        } else {
                            msgText = `*SESSION ID ✅*\n\n${fullSession}`;
                            msgButtons = [
                                { name: 'cta_copy', buttonParamsJson: JSON.stringify({ display_text: 'Copy Session', copy_code: fullSession }) },
                                { name: 'cta_url', buttonParamsJson: JSON.stringify({ display_text: 'Visit Bot Repo', url: BOT_REPO }) },
                                { name: 'cta_url', buttonParamsJson: JSON.stringify({ display_text: 'Join WaChannel', url: WA_CHANNEL }) }
                            ];
                        }

                        await sendButtons(Gifted, Gifted.user.id, {
                            title: '',
                            text: msgText,
                            footer: MSG_FOOTER,
                            buttons: msgButtons
                        });

                        await delay(2000);
                        await Gifted.ws.close();
                    } catch (sendError) {
                        console.error("Error sending session:", sendError);
                    } finally {
                        await cleanUpSession();
                    }

                } else if (connection === "close" && lastDisconnect && lastDisconnect.error && lastDisconnect.error.output?.statusCode != 401) {
                    await delay(10000);
                    GIFTED_QR_CODE();
                }
            });
        } catch (err) {
            console.error("Main error:", err);
            if (!responseSent) {
                res.status(500).json({ code: "QR Service is Currently Unavailable" });
                responseSent = true;
            }
            await cleanUpSession();
        }
    }

    try {
        await GIFTED_QR_CODE();
    } catch (finalError) {
        console.error("Final error:", finalError);
        await cleanUpSession();
        if (!responseSent) {
            res.status(500).json({ code: "Service Error" });
        }
    }
});

module.exports = router;
