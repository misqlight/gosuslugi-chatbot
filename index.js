const http = require('https');
const WebSocket = require('ws');

function generateString(length, symbols = '0123456789abcdef') {
    let result = '';
    for (let i = 0; i < length; i++)
        result += symbols[Math.floor(Math.random() * symbols.length)];
    return result;
}

class Chatbot {
    ws;
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

    _processIncoming(msg) {
        // TODO
    }

    connect(address = "wss://bot.gosuslugi.ru/api/v2/ws/socket.io/?EIO=4&transport=websocket") {
        if (!this.ws) {
            this.ws = new WebSocket(address);
            this.ws.on('message', data => this._processIncoming(data.toString()));
            this.ws.on('close', close);
        }
    }
    
    close() {
        if (this.ws.readyState !== WebSocket.CLOSED && this.ws.readyState !== WebSocket.CLOSING) this.ws.close();
        this.ws = undefined;
    }
}

exports.Chatbot = Chatbot;
