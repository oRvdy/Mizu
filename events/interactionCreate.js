const { Events } = require('discord.js');

module.exports = {
    name: Events.InteractionCreate,
    async execute(interaction) {
        // Remove duplicate handling here - let index.js handle it
        if (!interaction.inGuild()) return;
    }
};
