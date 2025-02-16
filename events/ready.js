const { ActivityType } = require('discord.js');
const cron = require('node-cron');

module.exports = {
    name: 'ready',
    once: true,
    execute(client) {
        console.log(`Bot online como ${client.user.tag}`);
        
        // Status rotativo
        const activities = [
            { name: '/help para comandos', type: ActivityType.Playing },
            { name: 'mush.com.br', type: ActivityType.Playing },
            { name: 'Estatísticas do BedWars', type: ActivityType.Watching }
        ];

        let currentActivity = 0;
        
        // Atualizar status a cada 10 minutos
        setInterval(() => {
            client.user.setActivity(activities[currentActivity]);
            currentActivity = (currentActivity + 1) % activities.length;
        }, 600000);

        // Reset semanal das metas dos clãs
        cron.schedule('59 23 * * 6', async () => {
            await client.clanManager.resetWeeklyGoals();
        });
    }
};
