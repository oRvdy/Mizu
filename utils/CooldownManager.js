class CooldownManager {
    constructor() {
        this.cooldowns = new Map();
    }

    setCooldown(userId, commandName, duration) {
        const key = `${userId}-${commandName}`;
        const expirationTime = Date.now() + duration;
        this.cooldowns.set(key, expirationTime);
        
        setTimeout(() => this.cooldowns.delete(key), duration);
    }

    getCooldownRemaining(userId, commandName) {
        const key = `${userId}-${commandName}`;
        const expirationTime = this.cooldowns.get(key);
        
        if (!expirationTime) return 0;
        
        const remaining = expirationTime - Date.now();
        return remaining > 0 ? remaining : 0;
    }
}

module.exports = new CooldownManager();
