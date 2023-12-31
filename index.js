const EventEmitter = require('node:events');
const http = require('https');
const WebSocket = require('ws');

function generateUUID() {
    function generateString(length, symbols = '0123456789abcdef') {
        let result = '';
        for (let i = 0; i < length; i++)
            result += symbols[Math.floor(Math.random() * symbols.length)];
        return result;
    }

    return [
        ('0000000' + Date.now().toString(16)).slice(-8), // Get the last 8 digits of the current timestamp in hex to make the UUID more unique
        generateString(4),
        '4' + generateString(3),
        generateString(1, '89ab') + generateString(3),
        generateString(12)
    ].join('-');
}

/**
 * @callback ChatbotListener
 * @param {Chatbot} chatbot
*/

/** 
 * @typedef {object} AnswerResult
 * @property {"button"|"link"|"moreResults"|"noMisprint"|"query"|null} type - Type of the result
 * @property {string} label - Label
 * @property {URL|null} link - Button target link 
 * @property {URL|null} image - Image URL
 */

/**
 * @typedef {Clarification}
 * @property {string} id - Clarification ID
 * @property {string} label - Clarification label
 * @property {string} content - Clarification content
 */

/** 
 * @typedef {object} ChatbotMessage
 * @property {string} uuid - Unique ID of the message
 * @property {string} action - Message action
 * @property {string} content - HTML code of the message content
 * @property {Clarification[]} clarifications - Message clarifications
 * @property {string|null} header - Message header
 * @property {Object} results - Answer results
 * @property {AnswerResult[]} results.inside - Results inside the message
 * @property {AnswerResult[]} results.outside - Results outside the message
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
            sessionId = generateUUID();

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
        if (msg.length > code.toString().length)
            var data = JSON.parse(msg.slice(code.toString().length));

        this.emit('message', code, data, msg);
        
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
     * Say hello to the bot and return the answer
     * @public
     * @returns {Promise<ChatbotMessage>}
     */
    async hello() {
        return new Promise((resolve, reject) => {
            const uuid = generateUUID();
            
            this.ws.send('42' + JSON.stringify(["hello_broker", { action: "hello_broker", uuid }]));

            const listener = (code, data) => {
                if (code !== 42 || data?.[0] !== 'hello_user' || data?.[1]?.uuid !== uuid) return;
                this.off('message', listener);
                resolve({
                    uuid,
                    action: data[0],
                    content: data[1].data.message.content,
                    header: data[1].data.message.header,
                    results: {
                        inside: data[1].data.message?.result?.inside?.map(res => {
                            return {
                                type: res.type,
                                label: res.label,
                                link: res.link ? new URL(res.link) : res.link,
                                image: res.image ? new URL(res.image) : res.image,
                            }
                        }) ?? [],
                        outside: data[1].data.message?.result?.outside?.map(res => {
                            return {
                                type: res.type,
                                label: res.label,
                                link: res.link ? new URL(res.link) : res.link,
                                image: res.image ? new URL(res.image) : res.image,
                            }
                        }) ?? [],
                    },
                    clarifications: data[1].data.message?.clarifications ?? []
                });
            };

            this.on('message', listener);
        });
    }

    /**
     * Send message to the bot and return the answer
     * @public
     * @param {string} text - Text to send
     * @returns {Promise<ChatbotMessage>}
     */
    async say(text) {
        return new Promise((resolve, reject) => {
            const uuid = generateUUID();

            this.ws.send('42' + JSON.stringify(["search_request", { action: "search_request", uuid, data: { query: { text, inputType: 'enter' } } }]));

            const listener = (code, data) => {
                if (code !== 42 || data?.[0] !== 'search_response' || data?.[1]?.uuid !== uuid) return;
                this.off('message', listener);
                resolve({
                    uuid,
                    action: data[0],
                    content: data[1].data.message.content,
                    header: data[1].data.message.header,
                    results: {
                        inside: data[1].data.message?.result?.inside?.map(res => {
                            return {
                                type: res.type,
                                label: res.label,
                                link: res.link ? new URL(res.link) : res.link,
                                image: res.image ? new URL(res.image) : res.image,
                            }
                        }) ?? [],
                        outside: data[1].data.message?.result?.outside?.map(res => {
                            return {
                                type: res.type,
                                label: res.label,
                                link: res.link ? new URL(res.link) : res.link,
                                image: res.image ? new URL(res.image) : res.image,
                            }
                        }) ?? [],
                    },
                    clarifications: data[1].data.message?.clarifications ?? []
                });
            };

            this.on('message', listener);
        });
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
     * @returns {Promise<Chatbot>}
     */
    async connect(address = "wss://bot.gosuslugi.ru/api/v2/ws/socket.io/?EIO=4&transport=websocket") {
        return new Promise((resolve, reject) => {
            if (!this.ws) {
                this._init();
                this.ws = new WebSocket(address);
                this.ws.on('message', data => this._processIncoming(data.toString()));
                this.ws.on('close', () => {
                    this.emit('close', this);
                    this.ws = undefined;
                });
                this.ws.on('open', () => {
                    this.emit('connect', this)
                    resolve(this);
                });
            }
        });
    }
}

exports.Chatbot = Chatbot;
