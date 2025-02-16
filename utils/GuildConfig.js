const mongoose = require('mongoose');

const guildConfigSchema = new mongoose.Schema({
    guildId: String,
    prefix: { type: String, default: '!' },
    logChannel: String,
    adminRoles: [String],
    welcomeChannel: String,
    welcomeMessage: String,
    autoRoles: [String],
    customCommands: [{
        name: String,
        response: String
    }]
});

module.exports = mongoose.model('GuildConfig', guildConfigSchema);
