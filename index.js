const EventEmitter = require('node:events');
const http = require('https');
const WebSocket = require('ws');

function generateString(length, symbols = '0123456789abcdef') {
    let result = '';
    for (let i = 0; i < length; i++)
        result += symbols[Math.floor(Math.random() * symbols.length)];
    return result;
}

/**
 * @callback ChatbotListener
 * @param {Chatbot} chatbot
*/

class Chatbot extends EventEmitter {
    /** @type {WebSocket} ws */
    ws;

    /**
     * API token
     * @type {string} token
     */
    token;

    /**
     * @public
     * @param {"connect"|"close"|"login"|"ping"} eventName - Event name to listen
     * @param {ChatbotListener} listener
     */
    addListener(eventName, listener) {
        super.addListener(eventName, listener)
    }

    /**
     * @public
     * @param {"connect"|"close"|"login"|"ping"} eventName - Event name to listen
     * @param {ChatbotListener} listener
     */
    on(eventName, listener) {
        super.addListener(eventName, listener)
    }

    /** 
     * Initialize API and get API token
     * @private
     * @param {string} [sessionId] - Session ID that match the pattern /^[a-fA-F0-9]{8}-[a-fA-F0-9]{4}-4[a-fA-F0-9]{3}-[89abAB][a-fA-F0-9]{3}-[a-fA-F0-9]{12}$/
     * @param {string} [platform] - Platform
     * @returns {Promise<string>}
     */
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
                    resolve(this.token);
                });
                res.on('error', reject);
            });

            request.write(JSON.stringify({ platform, sessionId }));
            request.end();
        });
    }

    /** 
     * @private
     * @param {string} msg - Input data
     * @returns {void}
     */
    _processIncoming(msg) {
        const code = parseInt(msg.match(/^\d+/)[0]);
        if (msg.length > code.length)
            var data = JSON.parse(msg.slice(code.length));
        
        switch (code) {
            case 0: // Authorization request
                this.ws.send('40' + JSON.stringify({ token: this.token }))
                this.emit('login', this);
                break;
            case 2: // Ping!
                this.emit('ping', this);
                this.ws.send('3'); // Pong!
                break;
        }
    }

    /**
     * Close the connection
     * @public
     * @returns {void}
     */
    close() {
        this.ws.close();
    }

    /**
     * Connect to the WebSocket Server
     * @public
     * @param {string|URL} [address] - Address to connect
     * @returns {void}
     */
    connect(address = "wss://bot.gosuslugi.ru/api/v2/ws/socket.io/?EIO=4&transport=websocket") {
        if (!this.ws) {
            this._init();
            this.ws = new WebSocket(address);
            this.ws.on('message', data => this._processIncoming(data.toString()));
            this.ws.on('close', () => {
                this.emit('close', this);
                this.ws = undefined;
            });
            this.ws.on('open', () => this.emit('connect', this));
        }
    }
}

exports.Chatbot = Chatbot;
