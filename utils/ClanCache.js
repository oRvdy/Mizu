const NodeCache = require('node-cache');

class ClanCache {
    constructor() {
        this.cache = new NodeCache({ stdTTL: 300 }); // 5 minutos
    }

    async getClanMembers(clanName) {
        const cached = this.cache.get(`clan_${clanName}`);
        if (cached) return cached;

        // Implementar lógica de busca de membros
        const members = await findClanMembers(clanName);
        this.cache.set(`clan_${clanName}`, members);
        return members;
    }
}

module.exports = new ClanCache();
