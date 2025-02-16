const fs = require('fs');
const path = require('path');

class GuildSettingsManager {
    constructor(client) {
        this.client = client;
        this.configDir = path.join(__dirname, '..', 'data', 'guild-settings');
        this.settings = {};
        this.defaultLogo = 'https://cdn.discordapp.com/icons/1324513232052031649/3a1f2c9ed19497a7f1f01ad79f0373a8.png?size=2048';
        this.validImageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp'];
        this.validDomains = [
            'cdn.discordapp.com',
            'media.discordapp.net',
            'i.imgur.com',
            'imgur.com'
        ];
        this.ensureConfigDir();
        this.loadAllSettings();
    }

    ensureConfigDir() {
        if (!fs.existsSync(this.configDir)) {
            fs.mkdirSync(this.configDir, { recursive: true });
        }
    }

    loadAllSettings() {
        try {
            if (!fs.existsSync(this.configDir)) return;
            
            const files = fs.readdirSync(this.configDir);
            for (const file of files) {
                if (!file.endsWith('.json')) continue;
                
                const guildId = file.replace('.json', '');
                this.settings[guildId] = JSON.parse(
                    fs.readFileSync(path.join(this.configDir, file), 'utf8')
                );
            }
        } catch (error) {
            console.error('Error loading guild settings:', error);
        }
    }

    saveGuildSettings(guildId) {
        try {
            const filePath = path.join(this.configDir, `${guildId}.json`);
            fs.writeFileSync(filePath, JSON.stringify(this.settings[guildId] || {}, null, 2));
        } catch (error) {
            console.error(`Error saving settings for guild ${guildId}:`, error);
        }
    }

    validateLogoUrl(url) {
        try {
            const parsedUrl = new URL(url);
            
            // Verificar domínio permitido
            if (!this.validDomains.some(domain => parsedUrl.hostname.includes(domain))) {
                return {
                    valid: false,
                    reason: 'Domínio não permitido'
                };
            }

            // Verificar extensão
            const ext = path.extname(parsedUrl.pathname).toLowerCase();
            if (!this.validImageExtensions.includes(ext)) {
                return {
                    valid: false,
                    reason: 'Extensão de arquivo inválida'
                };
            }

            return {
                valid: true
            };
        } catch (error) {
            return {
                valid: false,
                reason: 'URL inválida'
            };
        }
    }

    async setGuildLogo(guildId, logoUrl) {
        try {
            // Check license status
            const hasLicense = await this.client.licenses.checkGuildLicense(guildId);
            if (!hasLicense) {
                throw new Error('Este servidor não possui licença premium');
            }

            if (!this.settings[guildId]) {
                this.settings[guildId] = {};
            }

            if (logoUrl === null) {
                this.settings[guildId].logo = null;
            } else {
                const validation = this.validateLogoUrl(logoUrl);
                if (!validation.valid) {
                    throw new Error(validation.reason);
                }
                this.settings[guildId].logo = logoUrl;
            }

            this.saveGuildSettings(guildId);
            return true;
        } catch (error) {
            console.error('Error setting guild logo:', error);
            throw error;
        }
    }

    getGuildLogo(guildId) {
        // Se não houver configuração ou logo personalizada, retorna a logo padrão
        if (!this.settings[guildId] || !this.settings[guildId].logo) {
            return this.defaultLogo;
        }
        return this.settings[guildId].logo;
    }
}

module.exports = GuildSettingsManager;
