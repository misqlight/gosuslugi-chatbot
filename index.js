const http = require('https');

function generateString(length, symbols = '0123456789abcdef') {
    let result = '';
    for (let i = 0; i < length; i++)
        result += symbols[Math.floor(Math.random() * symbols.length)];
    return result;
}

class Chatbot {
    token;

    async _init(sessionId, platform = "epgu_desc") {
        if (!/^[a-fA-F0-9]{8}-[a-fA-F0-9]{4}-4[a-fA-F0-9]{3}-[89abAB][a-fA-F0-9]{3}-[a-fA-F0-9]{12}$/.test(sessionId))
            sessionId = [generateString(8), generateString(4), '4' + generateString(3), generateString(1, '89ab') + generateString(3), generateString(12)].join('-');

        return new Promise((resolve, reject) => {
            const request = http.request({
                method: 'POST',
                hostname: "bot.gosuslugi.ru",
                port: null,
                path: "/api/v2/init",
                header: { "Content-Type": "application/json" }
            }, (res) => {
                const chunks = [];

                res.on('data', chunk => chunks.push(chunk));
                res.on('end', () => {
                    this.token = JSON.parse(Buffer.concat(chunks).toString()).token;
                    resolve();
                });
                res.on('error', reject);
            });

            request.write(JSON.stringify({ platform, sessionId }));
            request.end();
        });
    }
}

exports.Chatbot = Chatbot;
