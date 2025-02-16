const fs = require('fs');
const path = require('path');
const { Collection } = require('discord.js');

class CommandManager {
    constructor(client) {
        this.client = client;
        this.client.commands = new Collection();
    }

    loadCommands() {
        const commandsPath = path.join(__dirname, '..', 'commands');
        const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));

        for (const file of commandFiles) {
            const filePath = path.join(commandsPath, file);
            const command = require(filePath);

            if ('data' in command && 'execute' in command) {
                this.client.commands.set(command.data.name, command);
            } else {
                console.log(`[WARNING] The command at ${filePath} is missing required properties.`);
            }
        }
    }
}

module.exports = CommandManager;
