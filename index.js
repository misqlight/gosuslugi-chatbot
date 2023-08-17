const http = require('https');

class Chatbot {
    token;

    async _init(sessionId, platform = "epgu_desc") {
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
