const { WebhookClient } = require('discord.js');
const winston = require('winston');

class Logger {
    constructor() {
        this.webhook = new WebhookClient({ url: process.env.LOG_WEBHOOK_URL });
        this.logger = winston.createLogger({
            format: winston.format.combine(
                winston.format.timestamp(),
                winston.format.json()
            ),
            transports: [
                new winston.transports.File({ filename: 'logs/error.log', level: 'error' }),
                new winston.transports.File({ filename: 'logs/combined.log' })
            ]
        });
    }

    async log(type, content) {
        this.logger.info({ type, content });
        await this.webhook.send({
            username: 'MizuBot Logs',
            content: `**[${type}]** ${content}`
        });
    }
}

module.exports = new Logger();
