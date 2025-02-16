const axios = require('axios');
const NodeCache = require('node-cache');

class CacheManager {
    constructor() {
        this.cache = new NodeCache({ 
            stdTTL: 300,
            checkperiod: 320
        });
    }

    async getPlayerStats(username) {
        const cacheKey = `player_${username.toLowerCase()}`;
        const cached = this.cache.get(cacheKey);
        if (cached) return cached;

        const stats = await axios.get(`https://mush.com.br/api/player/${username}`);
        this.cache.set(cacheKey, stats.data);
        return stats.data;
    }

    invalidateCache(username) {
        const cacheKey = `player_${username.toLowerCase()}`;
        this.cache.del(cacheKey);
    }
}

module.exports = new CacheManager();
