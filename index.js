require('dotenv').config();
const { Client, Collection, GatewayIntentBits, Events } = require('discord.js');
const { REST } = require('@discordjs/rest');
const { Routes } = require('discord-api-types/v9');
const fs = require('node:fs');
const path = require('node:path');
const RecruitmentManager = require('./utils/RecruitmentManager');
const LicenseManager = require('./handlers/LicenseManager');
const ClanManager = require('./handlers/ClanManager');
const PlayerManager = require('./utils/PlayerManager');
const GuildSettingsManager = require('./managers/GuildSettingsManager');

class RecruitmentSystem {
    constructor(client) {
        this.client = client;
        this.manager = new RecruitmentManager(client);
    }
}

const client = new Client({ 
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent
    ],
    shards: 'auto', // Let Discord.js handle sharding
    failIfNotExists: false,
    allowedMentions: {
        parse: ['users', 'roles'],
        repliedUser: true
    }
});

client.commands = new Collection();
client.licenses = new LicenseManager();
client.clans = new ClanManager(client);
client.players = new PlayerManager();
client.guildSettingsManager = new GuildSettingsManager(client);
client.recruitmentManager = new RecruitmentManager(client);

// Carregando comandos
const commandsPath = path.join(__dirname, 'commands');
const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));
const commands = [];

for (const file of commandFiles) {
    const filePath = path.join(commandsPath, file);
    const command = require(filePath);
    
    if ('data' in command && 'execute' in command) {
        // Verificar se o comando usa SlashCommandBuilder ou é um objeto simples
        if (typeof command.data === 'object' && !command.data.toJSON) {
            // Converter objeto simples para formato correto
            const { name, description, options = [] } = command.data;
            command.data = {
                name,
                description,
                options,
                toJSON() {
                    return {
                        name: this.name,
                        description: this.description,
                        options: this.options
                    };
                }
            };
        }
        
        client.commands.set(command.data.name, command);
        commands.push(command.data.toJSON());
    } else {
        console.warn(`[AVISO] O comando em ${filePath} está faltando a propriedade 'data' ou 'execute' necessária`);
    }
}

// Registro dos comandos slash
const rest = new REST({ version: '9' }).setToken(process.env.BOT_TOKEN);

client.once('ready', async () => {
    try {
        await rest.put(
            Routes.applicationCommands(client.user.id),
            { body: commands },
        );
        console.log('Comandos slash registrados com sucesso!');
    } catch (error) {
        console.error(error);
    }
});

// Load events
const eventsPath = path.join(__dirname, 'events');
const eventFiles = fs.readdirSync(eventsPath).filter(file => file.endsWith('.js'));

for (const file of eventFiles) {
    const filePath = path.join(eventsPath, file);
    const event = require(filePath);
    if (event.once) {
        client.once(event.name, (...args) => event.execute(...args));
    } else {
        client.on(event.name, (...args) => event.execute(...args));
    }
}

// Modify the ready event
client.once(Events.ClientReady, async () => {
    console.log(`Bot iniciado como ${client.user.tag}`);
    
    client.ownerId = '1283948475742031912';
    
    try {
        await client.licenses.init();
        console.log('✅ Sistema de licenças inicializado');
        
        await client.players.init();
        await client.clans.init();
        client.recruitmentManager = new RecruitmentManager(client);
        
        console.log('✅ Todos os sistemas inicializados com sucesso');
    } catch (error) {
        console.error('❌ Erro ao inicializar sistemas:', error);
    }
});

// Ensure connection is properly established before doing anything
client.once('ready', () => {
    console.log('✅ Sistema inicializado com sucesso');
});

// Handler de interações
client.on('interactionCreate', async interaction => {
    try {
        if (interaction.isCommand()) {
            const command = client.commands.get(interaction.commandName);
            if (!command) return;

            try {
                await command.execute(interaction);
            } catch (error) {
                console.error('Command execution error:', error);
                
                const errorMessage = { 
                    embeds: [{
                        description: '❌ **Ocorreu um erro ao executar este comando!**',
                        color: 0xff0000
                    }]
                };
                
                if (!interaction.replied && !interaction.deferred) {
                    await interaction.reply({ ...errorMessage, ephemeral: true });
                } else {
                    await interaction.editReply(errorMessage);
                }
            }
        } 
        // Adicionar manipulação de botões
        else if (interaction.isButton()) {
            // Para botões de recrutamento e tickets
            if (['apply_recruitment', 'apply_aranked', 'close_ticket'].includes(interaction.customId)) {
                await client.recruitmentManager.handleButton(interaction);
            }
            // Para botões do sistema CxC
            else if (['cxc', 'parceria', 'accept_cxc', 'decline_cxc'].includes(interaction.customId)) {
                const adminCxcCommand = client.commands.get('admincxc');
                if (adminCxcCommand) {
                    await adminCxcCommand.handleButton(interaction);
                }
            }
        }
        // Adicionar manipulação de modais
        else if (interaction.isModalSubmit()) {
            // Verificar se é um modal de edição de painel
            if (interaction.customId.startsWith('paineledit_')) {
                const [_, guildId, channelId] = interaction.customId.split('_');
                const channel = await interaction.guild.channels.fetch(channelId);
                
                if (channel) {
                    interaction.channel = channel; // Define o canal correto para edição
                    await client.recruitmentManager.handlePanelEditModal(interaction);
                } else {
                    await interaction.reply({
                        content: '❌ Canal não encontrado. O painel pode ter sido movido ou deletado.',
                        ephemeral: true
                    });
                }
            }
            // ...rest of existing modal handlers...
            else if (interaction.customId === 'recruitment_modal') {
                await client.recruitmentManager.handleRecruitmentModal(interaction);
            } 
            else if (interaction.customId === 'aranked_modal') {
                await client.recruitmentManager.handleArankedModal(interaction);
            }
            else if (interaction.customId === 'cxc-modal') {
                await client.recruitmentManager.handleCxCModal(interaction);
            }
            else if (interaction.customId === 'parceria-modal') {
                // Adicionar lógica para parceria se necessário
                await client.recruitmentManager.handleParceriaModal(interaction);
            }
        }
    } catch (error) {
        console.error('Error handling interaction:', error);
    }
});

function handleInteractionError(interaction) {
    const errorMessage = '❌ Ocorreu um erro ao processar sua solicitação.';
    if (interaction.deferred) {
        return interaction.editReply({ content: errorMessage, ephemeral: true }).catch(console.error);
    }
    if (!interaction.replied) {
        return interaction.reply({ content: errorMessage, ephemeral: true }).catch(console.error);
    }
}

// Add error handlers before client.login()
process.on('unhandledRejection', (reason, promise) => {
    console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

process.on('uncaughtException', (error) => {
    console.error('Uncaught Exception:', error);
});

client.on('error', (error) => {
    console.error('Client Error:', error);
});

client.ws.on('error', (error) => {
    console.error('WebSocket error:', error);
});

process.on('unhandledRejection', error => {
    console.error('Unhandled promise rejection:', error);
});

// Auto-reconnect on disconnect
client.on('disconnect', () => {
    console.log('Bot desconectado, tentando reconectar...');
    client.login(process.env.BOT_TOKEN).catch(console.error);
});

// Auto-reconnect function for the client
function setupAutoReconnect() {
    client.on('disconnect', function() {
        console.log('Desconectado do Discord. Tentando reconectar em 10 segundos...');
        setTimeout(() => {
            console.log('Tentando reconexão...');
            client.login(process.env.BOT_TOKEN).catch(setupAutoReconnect);
        }, 10000);
    });
}

setupAutoReconnect();

// Keep this at the end of the file
client.login(process.env.BOT_TOKEN).catch(console.error);