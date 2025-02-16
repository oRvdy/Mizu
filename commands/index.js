const { SlashCommandBuilder } = require('discord.js');
const fs = require('fs');
const path = require('path');

const commands = [];
const commandFiles = fs.readdirSync(path.join(__dirname))
    .filter(file => file.endsWith('.js') && file !== 'index.js');

for (const file of commandFiles) {
    const command = require(`./${file}`);
    if (command.data && command.data.name) {
        commands.push(command);
    } else {
        console.warn(`Warning: Command in file ${file} is missing 'data' or 'data.name' property`);
    }
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName('index')
        .setDescription('Comando principal do bot'),
    
    async execute(interaction) {
        await interaction.reply({
            content: 'Use /help para ver todos os comandos disponíveis!',
            ephemeral: true
        });
    }
};
