const cron = require('node-cron');
const path = require('path');
const fs = require('fs').promises;

class MetaManager {
    constructor(client) {
        this.client = client;
        this.dataPath = path.join(__dirname, '..', 'data', 'metas');
        this.setupReminders();
    }

    setupReminders() {
        // Check metas daily at midnight
        cron.schedule('0 0 * * *', () => this.checkDeadlines());
    }

    async checkDeadlines() {
        try {
            const files = await fs.readdir(this.dataPath);
            
            for (const file of files) {
                if (!file.endsWith('.json')) continue;

                const userData = JSON.parse(
                    await fs.readFile(path.join(this.dataPath, file), 'utf8')
                );

                const userId = file.replace('.json', '');
                const user = await this.client.users.fetch(userId);

                for (const [gamemode, data] of Object.entries(userData)) {
                    if (!data.endDate) continue;

                    const endDate = new Date(data.endDate);
                    const now = new Date();
                    const daysLeft = Math.ceil((endDate - now) / (1000 * 60 * 60 * 24));

                    if (daysLeft <= 1) {
                        await user.send(
                            `⚠️ Suas metas de ${gamemode} vencem em ${daysLeft} dia(s)! Use /menu para ver seu progresso.`
                        );
                    }
                }
            }
        } catch (error) {
            console.error('Erro ao verificar prazos:', error);
        }
    }
}

module.exports = MetaManager;
