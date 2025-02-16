const path = require('path');
const fs = require('fs').promises;

class LicenseManager {
    constructor() {
        this.configPath = path.join(__dirname, '..', 'config', 'authorized.json');
        this.authorizedServers = new Set();
        this.owner = '';
        this.restrictedCommands = ['meta', 'menu']; // Commands that need authorization
        this.loadConfig();
    }

    async loadConfig() {
        try {
            const data = await fs.readFile(this.configPath, 'utf8');
            const config = JSON.parse(data);
            this.authorizedServers = new Set(config.authorizedServers);
            this.owner = config.owner;
            console.log('Configuração carregada:', config); // Log para depuração
        } catch (error) {
            console.error('Erro ao carregar configuração de licenças:', error);
            // Create default config if it doesn't exist
            await this.saveConfig();
        }
    }

    isCommandAllowed(guildId, commandName) {
        // If command is not restricted, allow it
        if (!this.restrictedCommands.includes(commandName)) {
            return true;
        }
        
        // Check if server is authorized
        return this.authorizedServers.has(guildId);
    }

    isOwner(userId) {
        // Converter para string para garantir a comparação correta
        console.log('Comparando IDs:', String(userId), String(this.owner)); // Log para depuração
        return String(userId) === String(this.owner);
    }

    isAuthorized(guildId) {
        return this.authorizedServers.has(guildId);
    }

    getAuthorizedServers() {
        return Array.from(this.authorizedServers);
    }

    async addServer(guildId) {
        this.authorizedServers.add(guildId);
        await this.saveConfig();
    }

    async removeServer(guildId) {
        this.authorizedServers.delete(guildId);
        await this.saveConfig();
    }

    async saveConfig() {
        try {
            const config = {
                authorizedServers: Array.from(this.authorizedServers),
                owner: this.owner
            };
            await fs.writeFile(this.configPath, JSON.stringify(config, null, 4));
        } catch (error) {
            console.error('Erro ao salvar configuração de licenças:', error);
        }
    }

    getNotAuthorizedMessage() {
        return {
            embeds: [{
                title: '❌ Comando Premium',
                description: [
                    '> Este servidor não possui acesso a este recurso.',
                    '> Para adquirir acesso, utilize `/botinfo`.',
                    '',
                    '`💎` Sistema premium.'
                ].join('\n'),
                color: 0xff0000
            }],
            ephemeral: true
        };
    }
}

module.exports = LicenseManager;
