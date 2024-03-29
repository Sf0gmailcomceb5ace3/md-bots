/*
*   Quick search
*   Use "commandHandler" to quickly find the command
*   example: stickerHandler
*/

const fs = require('fs');
const axios = require("axios");
const PDFDocument = require("pdfkit");
const ytdown = require("./ytdown.js");
const deleteFile = require("./delete.js");
const scrapy = require("node-scrapy");
const Genius = require("genius-lyrics");
const webpConverter = require("./webpconverter.js");
const WSF = require("wa-sticker-formatter");
const NLP = require("@hiyurigi/nlp")("TextCorrection");
const menu = fs.readFileSync('./config/menu.txt', 'utf-8');
const languageList = fs.readFileSync("./config/lang.txt", "utf-8");
const factList = JSON.parse(fs.readFileSync("./lib/json/fact.json", "utf-8"));
const config = JSON.parse(fs.readFileSync('./config/config.json', 'utf-8'));
const quoteList = JSON.parse(fs.readFileSync("./lib/json/quotes.json", "utf-8"));
const dictionary = JSON.parse(fs.readFileSync('./config/dictionary.json', 'utf-8'));

const { writeFile } = require('fs/promises');
const { Brainly } = require("brainly-scraper-v2");
const { LatinKeAksara } = require("@sajenid/aksara.js");
const { proto, generateWAMessageFromContent, Mimetype, downloadContentFromMessage } = require('@adiwajshing/baileys-md');

const fetch = (...args) => import('node-fetch').then(({ default: fetch }) => fetch(...args));

// Sorting your command
dictionary.sort(function (a, b) {
    return b.length - a.length;
});

// Basic package setting
const inPdfInput = [];
const v = new NLP(dictionary);
const bufferImagesForPdf = {};
const brain = new Brainly("id");
const Client = new Genius.Client("uO-XWa9PYgZn-t7UrNW_YTDlUrNCtMq8xmCxySRRGXP4QJ0mtFwoqi1z-ywdGmXj");

// Config basic setting
const prefix = config.prefix;
const wm = config.watermark;

module.exports = async (conn, message) => {
    const senderNumber = message.key.remoteJid;
    const senderName = message.pushName || message.notify || conn.user.name;                                                                                                                                                                               //sender?.notify || sender?.short || sender?.name || sender?.vname
    const buttonMessages = message.message?.templateButtonReplyMessage?.selectedId;
    const imageMessage = message.message.imageMessage;
    const videoMessage = message.message.videoMessage;
    const extendedTextMessage = message.message.extendedTextMessage;
    const quotedMessageContext = extendedTextMessage && extendedTextMessage.contextInfo;
    const quotedMessage = quotedMessageContext && quotedMessageContext.quotedMessage;
    const textMessage = message.message.conversation || message.message.extendedTextMessage && message.message.extendedTextMessage.text || imageMessage && imageMessage.caption || videoMessage && videoMessage.caption || buttonMessages

    // handling command and parameter
    let command, parameter;
    if (buttonMessages) {
        command = buttonMessages;
    } else if (textMessage) {

        let a = textMessage.trim().split("\n");
        let b = "";

        b += a[0].split(" ").slice(1).join(" ");
        b += a.slice(1).join("\n")
        parameter = b.trim();

        // Prefix check
        c = a[0].split(" ")[0]
        pre = c.charAt(0);

        // Command check
        d = c.substring(1);

        if (pre == prefix) {
            if (!d) {
                let e = parameter.split(" ")
                d = e[0];

                parameter = parameter.split(" ").slice(1).join(" ");
            }

            let result = v.TextCorrection({
                Needle: d,
                Threshold: 0.7,
                NgramsLength: 1
            });

            command = result[0].Key;
        }
    }

    const watermark = wm + " " + prefix + command

    // Sticker owner
    stickerOwner = parameter || senderName || conn.user.name

    switch (command) {
        // menuHandle
        // helpHandler
        case "menu": case "help":
            {
                let caption = `Selamat  datang di *${conn.user.name}*\n\n${menu}`;

                conn.sendMessage(senderNumber, { text: caption }, { quoted: message });
                break;
            }

        // stickerHandler
        case "sticker":
            {
                if (quotedMessage) {
                    message.message = quotedMessage;
                }

                if (imageMessage) {
                    // download stream
                    const stream = await downloadContentFromMessage(imageMessage, 'image')
                    let buffer = Buffer.from([])
                    for await (const chunk of stream) {
                        buffer = Buffer.concat([buffer, chunk])
                    }
                    // save to file
                    const imagePath = Math.floor(Math.random() * 10000000) + ".jpeg";
                    await writeFile("./" + imagePath, buffer)

                    const sticker = new WSF.Sticker("./" + imagePath, {
                        crop: false,
                        pack: "Sticker",
                        author: stickerOwner
                    });

                    await sticker.build();
                    const bufferImage = await sticker.get();

                    conn.sendMessage(senderNumber, { sticker: bufferImage, mimetype: 'image/webp' }, { quoted: message });
                    await deleteFile(imagePath);
                } else {
                    conn.sendMessage(senderNumber, { text: "ups maaf kak gambarnya mana ya kak?" })
                }
                break;
            }

        case "gifsticker":
            {
                if (quotedMessage) {
                    message.message = quotedMessage;
                }

                if (message.message.videoMessage.seconds > 8) {
                    conn.sendMessage(senderNumber, { text: "Hmm... maksimal 8 detik kak maaf ya 🥺" }, {
                        quoted: message
                    });
                    break;
                }

                if (videoMessage) {
                    // download stream
                    const stream = await downloadContentFromMessage(videoMessage, 'video')
                    let buffer = Buffer.from([])
                    for await (const chunk of stream) {
                        buffer = Buffer.concat([buffer, chunk])
                    }
                    // save to file
                    const imagePath = Math.floor(Math.random() * 10000) + ".mp4";
                    await writeFile("./" + imagePath, buffer)

                    const sticker = new WSF.Sticker("./" + imagePath, {
                        animated: true,
                        pack: "Sticker",
                        author: stickerOwner
                    });

                    await sticker.build();
                    const bufferImage = await sticker.get();

                    conn.sendMessage(senderNumber, { sticker: bufferImage, mimetype: 'image/webp' }, { quoted: message });

                    await deleteFile(imagePath);
                } else {
                    conn.sendMessage(senderNumber, { text: "Ups maaf kak video atau gif nya mana ya kak?" })
                }
                break;
            }

        // toimgHandler
        case "toimg":
            {

                if (!quotedMessage || !quotedMessage.stickerMessage || quotedMessage.stickerMessage.mimetype != "image/webp") {
                    conn.sendMessage(senderNumber, { text: "Ups, stikernya mana ya kak?" }, {
                        quoted: message
                    });
                    break;
                }

                message.message = quotedMessage;

                const stream = await downloadContentFromMessage(message.message.stickerMessage, "image");
                let buffer = Buffer.from([])
                for await (const chunk of stream) {
                    buffer = Buffer.concat([buffer, chunk])
                }
                // save to file
                const imagePath = Math.floor(Math.random() * 10000000) + ".jpeg";
                await writeFile("./" + imagePath, buffer)

                await conn.sendMessage(senderNumber, {
                    image: { url: "./" + imagePath }, caption: "Stiker sudah diubah menjadi gambar (✿◡‿◡)"
                }, { quoted: message })

                await deleteFile(imagePath);

                break;
            }
        // togifhandler
        case "togif":
            {
                if (!quotedMessage || !quotedMessage.stickerMessage || quotedMessage.stickerMessage.mimetype != "image/webp") {
                    conn.sendMessage(senderNumber, { text: "Ups, stikernya mana ya kak?" }, {
                        quoted: message
                    });
                    break;
                }

                message.message = quotedMessage;

                const stream = await downloadContentFromMessage(message.message.stickerMessage, "image");
                let buffer = Buffer.from([])
                for await (const chunk of stream) {
                    buffer = Buffer.concat([buffer, chunk])
                }
                // save to file
                const imagePath = Math.floor(Math.random() * 10000000) + ".webp";
                const webpImage = "./" + imagePath;
                await writeFile(webpImage, buffer)

                const video = await webpConverter.webpToVideo(webpImage);

                conn.sendMessage(senderNumber, {
                    video: video,
                    caption: "Stiker sudah diubah menjadi Gif (✿◡‿◡)",
                    gifPlayback: true
                }, { quoted: message })

                await deleteFile(imagePath);

                break;
            }
        // BrainlyHandler
        case 'brainly':
            {
                if (quotedMessage) {
                    message.message = quotedMessage;
                } else if (!parameter) {
                    conn.sendMessage(senderNumber, { text: "Mau cari apa ya kak? silahkan diulangi ya kak 😊" }, { quoted: message });
                }

                brain.searchWithMT("id", parameter).then(res => {
                    let data = [];

                    for (var i = 0; i < res.length; i++) {
                        let question = res[i].question.content;
                        let answer = res[i].answers[0].content;

                        data.push({
                            title: `${question}\n\n`,
                            description: `Jawaban: ${answer}`,
                            rowId: "row" + i
                        });
                    }

                    const section = [{
                        title: watermark,
                        rows: data
                    }];

                    const buttons = {
                        buttonText: "Lihat Jawaban",
                        description: "Jawaban kamu sudah ada ditemukan\n\nSilahkan klik tombol dibawah (*/ω＼*).",
                        listType: 'SINGLE_SELECT',
                        sections: section
                    }

                    const templateList = generateWAMessageFromContent(message.key.remoteJid, proto.Message.fromObject({ "listMessage": buttons }), {});
                    conn.relayMessage(senderNumber, templateList.message, { messageId: templateList.key.id });

                }).catch(err => {
                    conn.sendMessage(senderNumber, "Maaf kak terjadi masalah, atau jawaban tidak ditemukan (┬┬﹏┬┬)", { quoted: message });
                    console.log('\x1b[31m%s\x1b[0m%s', `[ERROR] `, err);
                })

                break;
            }

        // gempaHandler

        case "gempa":
            {
                const model = ['tr:nth-child(1) td'];
                fetch('https://www.bmkg.go.id/gempabumi/gempabumi-terkini.bmkg').then((res) => res.text()).then((body) => {
                    let result = scrapy.extract(body, model);

                    let waktu = result[1] || "Tidak ada data";
                    let lintang = result[2] || "Tidak ada data";
                    let bujur = result[3] || "Tidak ada data";
                    let magnitudo = result[4] || "Tidak ada data";
                    let kedalaman = result[5] || "Tidak ada data";
                    let lokasi = result[6] || "Tidak ada data";

                    const text = `informasi gempa terbaru:\n\nWaktu: *${waktu}*\nBujur: *${bujur}*\nLintang: *${lintang}*\nMagnitudo: *${magnitudo}*\nKedalaman: *${kedalaman}*\nLokasi: *${lokasi}*`;

                    conn.sendMessage(senderNumber, { text: text }, {
                        quoted: message
                    });
                });
                break;
            }

        // Yt handler
        case "yt":
        case "ytmp3":
            {
                if (quotedMessage) {
                    message.message = quotedMessage;
                }

                if (!parameter) {
                    conn.sendMessage(senderNumber, { text: "Ups Link nya mana ya kak, jangan sampai lupa ya link nya hehehe (/≧▽≦)/" }, { quoted: message });
                }

                const mp3 = await ytdown.ytmp3(parameter);
                const mp4 = await ytdown.yt(parameter);

                if (mp3.title == "Not Found" || mp4.title == "Not Found") {
                    conn.sendMessage(senderNumber, { text: "Ups, Mohon maaf kami tidak bisa mendownload video kamu (┬┬﹏┬┬)" }, { quoted: message });
                } else {

                    const theButton = [
                        { index: 1, urlButton: { displayText: 'Download MP3', url: mp3.link } },
                        { index: 2, urlButton: { displayText: 'Download MP4', url: mp4.link } },
                    ]

                    const buttonMessage = {
                        caption: mp3.title,
                        footer: conn.user.name,
                        templateButtons: theButton,
                        headerType: 1
                    }

                    conn.sendMessage(senderNumber, buttonMessage, { quoted: message });
                }
                break;
            }

        // aksaraHandler
        case "aksara":
            {
                if (quotedMessage) {
                    message.message = quotedMessage;
                }

                if (!parameter) {
                    conn.sendMessage(senderNumber, { text: "Ups, teks yang mau diubah mana ya kak?" }, { quoted: message });
                }

                let aksara = LatinKeAksara(parameter);
                conn.sendMessage(senderNumber, { text: aksara }, { quoted: message });

                break;
            }

        //factHandler
        case "fact":
            {
                const fact = factList[Math.floor(Math.random() * factList.length)];
                const text = `_${fact}_`
                conn.sendMessage(senderNumber, { text: text }, {
                    quoted: message
                });

                break;
            }

        // quotesHandler
        case "quotes": {
            const quotes = quotesList[Math.floor(Math.random() * quoteList.length)];
            const text = `_"${quotes.quote}"_\n\n - ${quotes.by}`;

            conn.sendMessage(senderNumber, { text: text }, {
                quoted: message
            });
            break;
        }

        // lyricHandler
        case "lirik":
        case "lyrics":
            {
                if (!parameter) {
                    conn.sendMessage(senderNumber, { text: "Mau cari lagu apa kak?, silahkan diulangi ya" }, {
                        quoted: message
                    });
                    break;
                }

                const searches = await Client.songs.search(parameter);
                const firstSong = searches[0]

                if (!firstSong) {
                    conn.sendMessage(senderNumber, { text: `maaf kami tidak bisa menemukan lirik dari *${parameter}*😭  silahkan coba lagu yang lain` }, {
                        quoted: message
                    });
                } else {

                    const lyrics = await firstSong.lyrics();
                    const text = `lirik lagu *${firstSong.fullTitle}*\n\n${lyrics}`

                    conn.sendMessage(senderNumber, { text: text }, {
                        quoted: message
                    });
                }
                break;
            }

        //translateHandler
        case "tl":
        case "translate":
            {
                if (quotedMessage) {
                    message.message = quotedMessage;
                }

                if (!parameter) {
                    conn.sendMessage(senderNumber, { text: "Mau translate apa ya kak?" }, {
                        quoted: message
                    })
                } else {
                    const language = parameter.split(" ")[0];
                    const text = parameter.split(" ").splice(1).join(" ");
                    if (teslang.isSupported(language)) {

                        translate(text, {
                            to: language
                        }).then(res => {
                            const texts = `_${res}_`;

                            conn.sendMessage(senderNumber, { text: texts }, {
                                quoted: message
                            });
                        }).catch(err => {
                            console.error('\x1b[31m%s\x1b[0m', err);
                            conn.sendMessage(senderNumber, { text: "Ups, terjadi kesalahan 😭" }, { quoted: message })
                        });
                    } else {
                        const buttons = [
                            { buttonId: 'kodebahasa', buttonText: { displayText: 'Lihat Kode Bahasa' }, type: 1 },
                        ]

                        const buttonMessage = {
                            text: "Maaf bahasa yang kamu inginkan tidak ada di daftar bahasa kami.\nsilahkan klik tombol dibawah ini untuk melihat kode bahasa yang tersedia.",
                            footerText: watermark,
                            buttons: buttons,
                            headerType: 1
                        }

                        conn.sendMessage(senderNumber, buttonMessage);
                    }
                }
                break;
            }
        //kodebahasaHandler
        case "kodebahasa":
            {
                conn.sendMessage(senderNumber, { text: languageList }, { quoted: message });
            }

        default:
            {
                console.log('new message received but not a command');
            }

    }
}
