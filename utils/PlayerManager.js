const axios = require('./axios');
const fs = require('fs').promises;
const path = require('path');

class PlayerManager {
    constructor() {
        this.dataPath = path.join(__dirname, '..', 'data', 'player-links.json');
        this.links = new Map();
    }

    async init() {
        try {
            await fs.mkdir(path.dirname(this.dataPath), { recursive: true });
            try {
                const data = await fs.readFile(this.dataPath, 'utf8');
                const links = JSON.parse(data);
                for (const [discordId, nickname] of Object.entries(links)) {
                    this.links.set(discordId, nickname);
                }
                console.log('Sistema de vinculação inicializado com sucesso');
            } catch (error) {
                if (error.code !== 'ENOENT') console.error('Erro ao carregar vinculações:', error);
            }
        } catch (error) {
            console.error('Erro ao inicializar sistema de vinculação:', error);
        }
    }

    async verifyPlayer(discordId, nickname = null) {
        try {
            // Se não foi fornecido nickname, tentar pegar da vinculação salva
            const savedNick = this.links.get(discordId);
            const checkNick = nickname || savedNick;

            if (!checkNick) {
                throw new Error('Você precisa vincular seu nickname primeiro usando `/menu`');
            }

            // Verificar na API do Mush
            const response = await axios.get(`https://mush.com.br/api/player/${checkNick}`);
            
            if (!response.data?.response) {
                throw new Error('Jogador não encontrado no Mush');
            }

            const playerData = response.data.response;

            // Verificar vinculação do Discord
            if (!playerData.discord?.id || playerData.discord.id !== discordId) {
                throw new Error('Seu Discord não está vinculado a esta conta no Mush. Use `/discord` no servidor do Mush.');
            }

            return {
                verified: true,
                nickname: checkNick,
                data: playerData
            };
        } catch (error) {
            if (error.response?.status === 404) {
                throw new Error('Jogador não encontrado no Mush');
            }
            throw error;
        }
    }

    async linkPlayer(discordId, nickname) {
        try {
            // Verificar se o jogador existe e está vinculado
            const verification = await this.verifyPlayer(discordId, nickname);
            
            // Salvar vinculação
            this.links.set(discordId, nickname);
            await this.saveLinks();

            return verification;
        } catch (error) {
            console.error('Erro ao vincular jogador:', error);
            throw error;
        }
    }

    async saveLinks() {
        try {
            const data = Object.fromEntries(this.links);
            await fs.writeFile(this.dataPath, JSON.stringify(data, null, 2));
        } catch (error) {
            console.error('Erro ao salvar vinculações:', error);
            throw error;
        }
    }

    async getPlayerNickname(discordId) {
        return this.links.get(discordId);
    }
}

module.exports = PlayerManager;
