const fs = require('fs');
const path = require('path');

class LicenseManager {
    constructor() {
        this.configPath = path.join(__dirname, '..', 'data', 'licenses.json');
        this.licenses = new Map();
        this.backupPath = path.join(__dirname, '..', 'data', 'licenses_backup');
        this.ensureConfigFile();
    }

    init() {
        this.loadLicenses();
        this.startLicenseCheck();
        console.log('License Manager initialized');
        // Criar backup diário
        this.scheduleBackup();
    }

    ensureConfigFile() {
        const dir = path.dirname(this.configPath);
        const backupDir = this.backupPath;
        
        [dir, backupDir].forEach(path => {
            if (!fs.existsSync(path)) {
                fs.mkdirSync(path, { recursive: true });
            }
        });

        if (!fs.existsSync(this.configPath)) {
            fs.writeFileSync(this.configPath, JSON.stringify({}, null, 2));
        }
    }

    createBackup() {
        const date = new Date().toISOString().split('T')[0];
        const backupFile = path.join(this.backupPath, `licenses_${date}.json`);
        fs.copyFileSync(this.configPath, backupFile);

        // Manter apenas os últimos 7 dias de backup
        const files = fs.readdirSync(this.backupPath);
        if (files.length > 7) {
            const oldestFile = files.sort()[0];
            fs.unlinkSync(path.join(this.backupPath, oldestFile));
        }
    }

    scheduleBackup() {
        // Criar backup a cada 24 horas
        setInterval(() => this.createBackup(), 24 * 60 * 60 * 1000);
        // Criar backup inicial
        this.createBackup();
    }

    loadLicenses() {
        try {
            const data = JSON.parse(fs.readFileSync(this.configPath, 'utf8'));
            this.licenses = new Map(Object.entries(data));
            
            // Converter strings de data para objetos Date
            for (const [guildId, license] of this.licenses) {
                if (license.expiresAt) {
                    license.expiresAt = new Date(license.expiresAt);
                }
                if (license.createdAt) {
                    license.createdAt = new Date(license.createdAt);
                }
            }
        } catch (error) {
            console.error('Error loading licenses:', error);
            this.licenses = new Map();
        }
    }

    saveLicenses() {
        try {
            const data = {};
            for (const [guildId, license] of this.licenses) {
                data[guildId] = {
                    ...license,
                    expiresAt: license.expiresAt?.toISOString(),
                    createdAt: license.createdAt?.toISOString()
                };
            }
            fs.writeFileSync(this.configPath, JSON.stringify(data, null, 2));
        } catch (error) {
            console.error('Error saving licenses:', error);
        }
    }

    startLicenseCheck() {
        // Verificar licenças a cada hora
        setInterval(() => this.checkExpiredLicenses(), 60 * 60 * 1000);
        // Verificar imediatamente ao iniciar
        this.checkExpiredLicenses();
    }

    checkExpiredLicenses() {
        const now = new Date();
        for (const [guildId, license] of this.licenses) {
            if (license.expiresAt && new Date(license.expiresAt) < now) {
                console.log(`License expired for guild ${guildId}`);
                // Aqui você pode adicionar notificações ou ações adicionais
            }
        }
    }

    async checkGuildLicense(guildId) {
        const license = this.licenses.get(guildId);
        if (!license) return false;

        if (!license.expiresAt) return true;

        return new Date(license.expiresAt) > new Date();
    }

    async getLicenseStatus(guildId) {
        const license = this.licenses.get(guildId);
        if (!license) return null;

        const now = new Date();
        const createdAt = new Date(license.createdAt);

        if (!license.expiresAt) {
            return {
                status: 'active',
                createdAt,
                type: 'lifetime'
            };
        }

        const expiresAt = new Date(license.expiresAt);
        const daysLeft = Math.ceil((expiresAt - now) / (1000 * 60 * 60 * 24));

        return {
            status: expiresAt > now ? 'active' : 'expired',
            createdAt,
            expiresAt,
            daysLeft
        };
    }

    setLicense(guildId, licenseData) {
        this.licenses.set(guildId, {
            ...licenseData,
            createdAt: new Date(licenseData.createdAt || Date.now()),
            expiresAt: licenseData.expiresAt ? new Date(licenseData.expiresAt) : null
        });
        this.saveLicenses();
    }

    removeLicense(guildId) {
        this.licenses.delete(guildId);
        this.saveLicenses();
    }

    extendLicense(guildId, days) {
        const license = this.licenses.get(guildId);
        if (!license) return false;

        if (!license.expiresAt) return true; // Licença permanente

        const currentExpiry = new Date(license.expiresAt);
        license.expiresAt = new Date(currentExpiry.getTime() + days * 24 * 60 * 60 * 1000);
        this.saveLicenses();
        return true;
    }

    getPremiumServers() {
        const activeServers = [];
        for (const [guildId, license] of this.licenses) {
            if (this.checkGuildLicense(guildId)) {
                activeServers.push(guildId);
            }
        }
        return activeServers;
    }

    async isAuthorized(userId) {
        // Lista de IDs autorizados
        const authorizedUsers = [
            '1283948475742031912', // Owner ID
            // Adicione outros IDs autorizados aqui
        ];
        
        return authorizedUsers.includes(userId);
    }

    // Método auxiliar para verificar se é o dono do bot
    isOwner(userId) {
        return userId === '1283948475742031912';
    }

    // Método para gerenciar erros de interação
    async handleInteractionError(interaction, error) {
        console.error('License error:', error);
        
        try {
            if (error.code === 40060) {
                console.log('Interaction already acknowledged');
                return;
            }

            const response = {
                content: '❌ Ocorreu um erro ao processar o comando.',
                flags: 64 // Use flags instead of ephemeral
            };

            if (!interaction.replied && !interaction.deferred) {
                await interaction.reply(response);
            } else if (interaction.deferred) {
                await interaction.editReply(response);
            }
        } catch (replyError) {
            console.error('Error handling interaction error:', replyError);
        }
    }

    async addLicense(guildId, duration) {
        const now = new Date();
        let expiresAt = null;

        if (duration) {
            const durationMs = this.parseDuration(duration);
            if (durationMs) {
                expiresAt = new Date(now.getTime() + durationMs);
            }
        }

        this.licenses.set(guildId, {
            createdAt: now,
            expiresAt
        });

        this.saveLicenses();
        return expiresAt;
    }

    parseDuration(duration) {
        const match = duration.match(/^(\d+)([dhms])$/);
        if (!match) return null;

        const value = parseInt(match[1], 10);
        const unit = match[2];

        switch (unit) {
            case 'd': return value * 24 * 60 * 60 * 1000;
            case 'h': return value * 60 * 60 * 1000;
            case 'm': return value * 60 * 1000;
            case 's': return value * 1000;
            default: return null;
        }
    }

    hasPremium(guildId) {
        const license = this.licenses.get(guildId);
        if (!license) return false;
        if (license.expiresAt && new Date() > license.expiresAt) return false;
        return true;
    }

    getRemainingTime(expiresAt) {
        const now = new Date();
        const timeDiff = expiresAt - now;
        const days = Math.floor(timeDiff / (1000 * 60 * 60 * 24));
        const hours = Math.floor((timeDiff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        const minutes = Math.floor((timeDiff % (1000 * 60 * 60)) / (1000 * 60));
        return `${days}d ${hours}h ${minutes}m`;
    }
}

module.exports = LicenseManager;
