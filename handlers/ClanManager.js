const { Collection, EmbedBuilder } = require('discord.js');
const fs = require('fs').promises;
const path = require('path');
const axios = require('axios');

class ClanManager {
    constructor(client) {
        this.client = client;
        this.clans = new Collection();
        this.dataPath = path.join(__dirname, '..', 'data', 'clans');
        this.weeklyResets = new Collection();
    }

    async init() {
        try {
            await fs.mkdir(this.dataPath, { recursive: true });
            await this.loadClans();
            this.setupWeeklyReset();
            return true;
        } catch (error) {
            console.error('Erro ao inicializar ClanManager:', error);
            return false;
        }
    }

    async loadClans() {
        const files = await fs.readdir(this.dataPath);
        for (const file of files) {
            if (!file.endsWith('.json')) continue;
            const data = JSON.parse(await fs.readFile(path.join(this.dataPath, file), 'utf8'));
            this.clans.set(data.id, data);
        }
    }

    async createClan(guildId, name, owner, members) {
        try {
            if (this.clans.find(c => c.guildId === guildId)) {
                throw new Error('Este servidor já possui um clan registrado.');
            }

            // Buscar estatísticas iniciais de todos os membros
            const memberPromises = members.map(async (m) => {
                const stats = await this.getInitialStats(m);
                return {
                    username: m,
                    joinedAt: new Date(),
                    stats
                };
            });

            const memberData = await Promise.all(memberPromises);

            const clanData = {
                id: `clan_${Date.now()}`,
                guildId,
                name,
                owner,
                members: memberData,
                createdAt: new Date(),
                weeklyStats: {
                    wins: 0,
                    kills: 0,
                    xp: 0,
                    lastReset: new Date()
                },
                goals: {
                    weekly: {
                        wins: 100,
                        kills: 500,
                        xp: 10000
                    }
                }
            };

            await this.saveClan(clanData);
            this.clans.set(clanData.id, clanData);
            return clanData;
        } catch (error) {
            console.error('Erro ao criar clan:', error);
            throw error;
        }
    }

    async getInitialStats(username) {
        try {
            const response = await axios.get(`https://mush.com.br/api/player/${username}`);
            const stats = response.data.response.stats.bedwars;
            return {
                initial: {
                    wins: stats.wins || 0,
                    kills: stats.final_kills || 0,
                    xp: stats.xp || 0
                },
                current: {
                    wins: stats.wins || 0,
                    kills: stats.final_kills || 0,
                    xp: stats.xp || 0
                }
            };
        } catch (error) {
            console.error(`Erro ao buscar estatísticas de ${username}:`, error);
            return {
                initial: { wins: 0, kills: 0, xp: 0 },
                current: { wins: 0, kills: 0, xp: 0 }
            };
        }
    }

    async updateMemberStats(clanId, username) {
        const clan = this.clans.get(clanId);
        if (!clan) return null;

        const member = clan.members.find(m => m.username === username);
        if (!member) return null;

        const stats = await this.getInitialStats(username);
        member.stats.current = stats.current;
        
        // Calcular contribuições semanais
        const contribution = {
            wins: stats.current.wins - member.stats.initial.wins,
            kills: stats.current.kills - member.stats.initial.kills,
            xp: stats.current.xp - member.stats.initial.xp
        };

        await this.saveClan(clan);
        return contribution;
    }

    async saveClan(clanData) {
        await fs.writeFile(
            path.join(this.dataPath, `${clanData.id}.json`),
            JSON.stringify(clanData, null, 2)
        );
    }

    setupWeeklyReset() {
        // Reset todo sábado às 23:59
        const now = new Date();
        const nextSaturday = new Date();
        nextSaturday.setDate(now.getDate() + (6 - now.getDay()));
        nextSaturday.setHours(23, 59, 0, 0);

        const timeUntilReset = nextSaturday.getTime() - now.getTime();
        setTimeout(() => this.resetWeeklyStats(), timeUntilReset);
    }

    async resetWeeklyStats() {
        for (const [clanId, clanData] of this.clans) {
            clanData.weeklyStats = {
                wins: 0,
                kills: 0,
                xp: 0,
                lastReset: new Date()
            };

            // Atualizar estatísticas iniciais dos membros
            for (const member of clanData.members) {
                const stats = await this.getInitialStats(member.username);
                member.stats.initial = stats.current;
            }

            await this.saveClan(clanData);
        }

        this.setupWeeklyReset(); // Configurar próximo reset
    }

    async generateStatusEmbed(clanId) {
        const clan = this.clans.get(clanId);
        if (!clan) return null;

        const embed = new EmbedBuilder()
            .setTitle(`🛡️ Status do Clan ${clan.name}`)
            .setColor('#0099ff')
            .setDescription(`
                ### 📊 Progresso Semanal
                ${this.formatProgress('Vitórias', clan.weeklyStats.wins, clan.goals.weekly.wins)}
                ${this.formatProgress('Abates', clan.weeklyStats.kills, clan.goals.weekly.kills)}
                ${this.formatProgress('XP', clan.weeklyStats.xp, clan.goals.weekly.xp)}

                ### 👥 Membros
                ${clan.members.map(m => {
                    const contrib = {
                        wins: m.stats.current.wins - m.stats.initial.wins,
                        kills: m.stats.current.kills - m.stats.initial.kills,
                        xp: m.stats.current.xp - m.stats.initial.xp
                    };
                    return `**${m.username}**\n➥ +${contrib.wins} wins, +${contrib.kills} kills, +${contrib.xp} xp`;
                }).join('\n\n')}
            `)
            .setFooter({ text: `Último reset: ${clan.weeklyStats.lastReset.toLocaleDateString()}` })
            .setTimestamp();

        return embed;
    }

    formatProgress(label, current, goal) {
        const percentage = Math.min((current / goal) * 100, 100);
        const bars = '■'.repeat(Math.floor(percentage / 10)) + '□'.repeat(10 - Math.floor(percentage / 10));
        return `> ${label}: ${current}/${goal} [${bars}] ${percentage.toFixed(1)}%`;
    }
}

module.exports = ClanManager;
