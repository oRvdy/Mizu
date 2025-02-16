const { 
    EmbedBuilder, 
    ActionRowBuilder, 
    ButtonBuilder, 
    ButtonStyle, 
    ModalBuilder, 
    TextInputBuilder, 
    TextInputStyle, 
    ChannelType,
    PermissionsBitField
} = require('discord.js');
const axios = require('../utils/axios');
const fs = require('fs');
const path = require('path');

class RecruitmentManager {
    constructor(client) {
        if (!client) throw new Error('Client is required for RecruitmentManager');
        this.client = client;
        this.configDir = path.join(__dirname, '..', 'data', 'recruitment-configs');
        this.ticketsFile = path.join(this.configDir, 'tickets.json');
        this.messagesFile = path.join(this.configDir, 'messages.json');
        this.tickets = {};
        this.messages = {};
        this.panelMessages = {};
        this.panelMessagesFile = path.join(this.configDir, 'panel-messages.json');
        this.serverConfigs = {};
        this.configsFile = path.join(this.configDir, 'server-configs.json');

        // Initialize default requirements
        this.requirements = {
            minFKDR: 2.0,
            minLevel: 20
        };

        // Create config directory and load data
        this.ensureConfigDir();
        this.loadTickets();
        this.loadMessages();
        this.loadPanelMessages();
        this.loadServerConfigs();

        // Add default server settings
        this.defaultSettings = {
            ticketCategories: {
                recruitment: 'RECRUTAMENTO',
                aranked: 'ARANKED',
                cxc: 'CLAN X CLAN',
                partnership: 'PARCERIAS'
            },
            permissions: {
                adminRole: null,
                modRole: null,
                staffRoles: []
            }
        };
    }

    // Move these ticket management methods to the top of the class
    addTicket(guildId, userId, channelId) {
        if (!this.tickets[guildId]) {
            this.tickets[guildId] = {};
        }
        this.tickets[guildId][userId] = channelId;
        this.saveTickets();
    }

    removeTicket(guildId, userId) {
        if (this.tickets[guildId]?.[userId]) {
            delete this.tickets[guildId][userId];
            if (Object.keys(this.tickets[guildId]).length === 0) {
                delete this.tickets[guildId];
            }
            this.saveTickets();
        }
    }

    async checkExistingTicket(guild, userId) {
        try {
            // Check if we have a ticket record for this user in this guild
            const guildTickets = this.tickets[guild.id] || {};
            const existingTicketId = guildTickets[userId];

            if (!existingTicketId) return null;

            // Try to fetch the channel to make sure it still exists
            const channel = await guild.channels.fetch(existingTicketId).catch(() => null);
            
            if (!channel) {
                // Channel no longer exists, clean up the record
                this.removeTicket(guild.id, userId);
                return null;
            }

            return existingTicketId;
        } catch (error) {
            console.error('Error checking existing ticket:', error);
            return null;
        }
    }

    ensureConfigDir() {
        try {
            // Create main config directory if it doesn't exist
            if (!fs.existsSync(this.configDir)) {
                fs.mkdirSync(this.configDir, { recursive: true });
            }

            // Create default files if they don't exist
            const defaultFiles = {
                [this.ticketsFile]: {},
                [this.messagesFile]: {},
                [this.panelMessagesFile]: {},
                [this.configsFile]: {}
            };

            for (const [filePath, defaultContent] of Object.entries(defaultFiles)) {
                if (!fs.existsSync(filePath)) {
                    fs.writeFileSync(filePath, JSON.stringify(defaultContent, null, 2));
                }
            }
        } catch (error) {
            console.error('Error ensuring config directory exists:', error);
        }
    }

    loadTickets() {
        try {
            if (fs.existsSync(this.ticketsFile)) {
                const data = fs.readFileSync(this.ticketsFile, 'utf8');
                this.tickets = JSON.parse(data);
            } else {
                this.tickets = {};
                this.saveTickets();
            }
        } catch (error) {
            console.error('Error loading tickets:', error);
            this.tickets = {};
        }
    }

    loadMessages() {
        try {
            if (fs.existsSync(this.messagesFile)) {
                const data = fs.readFileSync(this.messagesFile, 'utf8');
                this.messages = JSON.parse(data);
            } else {
                this.messages = {};
                this.saveMessages();
            }
        } catch (error) {
            console.error('Error loading messages:', error);
            this.messages = {};
        }
    }

    loadPanelMessages() {
        try {
            if (fs.existsSync(this.panelMessagesFile)) {
                const data = fs.readFileSync(this.panelMessagesFile, 'utf8');
                this.panelMessages = JSON.parse(data);
            } else {
                this.panelMessages = {};
                this.savePanelMessages();
            }
        } catch (error) {
            console.error('Error loading panel messages:', error);
            this.panelMessages = {};
        }
    }

    loadServerConfigs() {
        try {
            if (fs.existsSync(this.configsFile)) {
                const data = fs.readFileSync(this.configsFile, 'utf8');
                this.serverConfigs = JSON.parse(data);
            } else {
                this.serverConfigs = {};
                this.saveServerConfigs();
            }
        } catch (error) {
            console.error('Error loading server configs:', error);
            this.serverConfigs = {};
        }
    }

    saveTickets() {
        try {
            fs.writeFileSync(this.ticketsFile, JSON.stringify(this.tickets, null, 2));
        } catch (error) {
            console.error('Error saving tickets:', error);
        }
    }

    saveMessages() {
        try {
            fs.writeFileSync(this.messagesFile, JSON.stringify(this.messages, null, 2));
        } catch (error) {
            console.error('Error saving messages:', error);
        }
    }

    savePanelMessages() {
        try {
            fs.writeFileSync(this.panelMessagesFile, JSON.stringify(this.panelMessages, null, 2));
        } catch (error) {
            console.error('Error saving panel messages:', error);
        }
    }

    saveServerConfigs() {
        try {
            fs.writeFileSync(this.configsFile, JSON.stringify(this.serverConfigs, null, 2));
        } catch (error) {
            console.error('Error saving server configs:', error);
        }
    }

    async handleParceriaModal(interaction) {
        try {
            if (!interaction.deferred && !interaction.replied) {
                await interaction.deferReply({ flags: 1 << 6 }); // Using flags instead of ephemeral
            }

            const nick = interaction.fields.getTextInputValue('nick')?.trim();
            const discordLink = interaction.fields.getTextInputValue('discord_link')?.trim();

            // Input validation
            if (!nick || !discordLink) {
                return await interaction.editReply({
                    content: '❌ Por favor, preencha todos os campos corretamente.',
                    flags: 1 << 6
                });
            }

            // Check existing tickets
            const existingTicketId = await this.checkExistingTicket(interaction.guild, interaction.user.id);
            if (existingTicketId) {
                return await interaction.editReply({
                    content: `❌ Você já possui um ticket aberto! <#${existingTicketId}>`,
                    flags: 1 << 6
                });
            }

            // Create the ticket channel and handle the rest
            const category = await this.getTicketCategory(interaction.guild, 'partnership');
            const ticketChannel = await this.createPartnershipTicket(interaction, nick, discordLink, category);

            // Save the ticket in our system
            this.addTicket(interaction.guild.id, interaction.user.id, ticketChannel.id);

            return await interaction.editReply({
                content: `✅ Ticket de parceria criado! Canal: <#${ticketChannel.id}>`,
                flags: 1 << 6
            });

        } catch (error) {
            console.error('Error in partnership modal:', error);
            const response = {
                content: '❌ Erro ao criar ticket de parceria.',
                flags: 1 << 6
            };

            if (interaction.replied || interaction.deferred) {
                return await interaction.editReply(response);
            }
            return await interaction.reply(response);
        }
    }

    async createPartnershipTicket(interaction, nick, discordLink, category) {
        // Create the ticket channel
        const ticketChannel = await interaction.guild.channels.create({
            name: `parceria-${nick.toLowerCase()}`,
            type: ChannelType.GuildText,
            parent: category,
            permissionOverwrites: [
                {
                    id: interaction.guild.id,
                    deny: [PermissionsBitField.Flags.ViewChannel]
                },
                {
                    id: interaction.user.id,
                    allow: [
                        PermissionsBitField.Flags.ViewChannel,
                        PermissionsBitField.Flags.SendMessages,
                        PermissionsBitField.Flags.ReadMessageHistory
                    ]
                },
                {
                    id: interaction.client.user.id,
                    allow: [
                        PermissionsBitField.Flags.ViewChannel,
                        PermissionsBitField.Flags.SendMessages,
                        PermissionsBitField.Flags.ManageChannels
                    ]
                }
            ]
        });

        // Create and send the embed
        const embed = new EmbedBuilder()
            .setTitle('💫 Nova Solicitação de Parceria')
            .setColor('#00ff00')
            .addFields([
                {
                    name: '👤 Solicitante',
                    value: `<@${interaction.user.id}> (${nick})`,
                    inline: true
                },
                {
                    name: '🔗 Discord',
                    value: discordLink,
                    inline: true
                }
            ])
            .setFooter({
                text: `${interaction.guild.name} • Sistema de Parcerias`,
                iconURL: interaction.guild.iconURL({ dynamic: true })
            })
            .setTimestamp();

        // Add close button
        const closeButton = new ButtonBuilder()
            .setCustomId('close_ticket')
            .setLabel('🔒 Fechar Ticket')
            .setStyle(ButtonStyle.Danger);

        const row = new ActionRowBuilder().addComponents(closeButton);

        const config = this.getServerConfig(interaction.guild.id);
        const notifyRoles = config.notifyRoles || [];
        const notifyMentions = notifyRoles.length > 0 
            ? notifyRoles.map(roleId => `<@&${roleId}>`).join(' ') 
            : '';

        // Send the initial message with all notification roles
        await ticketChannel.send({
            content: `<@${interaction.user.id}>${notifyMentions ? ` | ${notifyMentions}` : ''}`,
            embeds: [embed],
            components: [row]
        });

        return ticketChannel;
    }

    async setupRecruitmentPanel(channel, existingMessage = null) {
        const embed = new EmbedBuilder()
            .setTitle(`<:Mush:1325298452812271676> Recrutamento - ${channel.guild.name}`)
            .setColor('#00ff00')
            .setThumbnail(channel.guild.iconURL({ dynamic: true, size: 256 }))
            .setDescription([
                '### 📋 Requisitos para Recrutamento\n',
                '> Para se juntar à equipe, você precisa:',
                `• FKDR mínimo: **${this.requirements.minFKDR}**`,
                `• Nível mínimo: **${this.requirements.minLevel}**\n`,
                '### ⚠️ Informações Importantes',
                '• Sua conta do Discord deve estar vinculada ao Mush.',
                '• Você deve ter jogado nas últimas 24 horas.',
                '• Apenas um recrutamento por vez é permitido.\n',
                '### 🎯 Como Participar',
                '1. Clique no botão abaixo.',
                '2. Digite seu nickname do Mush.',
                '3. Aguarde a verificação automática.'
            ].join('\n'))
            .setFooter({ 
                text: `${channel.guild.name} - Recrutamento`,
                iconURL: channel.guild.iconURL({ dynamic: true })
            })
            .setTimestamp();

        const normalButton = new ButtonBuilder()
            .setCustomId('apply_recruitment')
            .setLabel('📝 Recrutamento')
            .setStyle(ButtonStyle.Success);

        const arankedButton = new ButtonBuilder()
            .setCustomId('apply_aranked')
            .setLabel('👑 ARANKED')
            .setStyle(ButtonStyle.Primary);

        const row = new ActionRowBuilder().addComponents(normalButton, arankedButton);

        if (existingMessage) {
            return await existingMessage.edit({ embeds: [embed], components: [row] });
        } else {
            return await channel.send({ embeds: [embed], components: [row] });
        }
    }

    async createRecruitmentTicket(interaction, username, stats, playerData, isAranked = false) {
        try {
            const categoryType = isAranked ? 'aranked' : 'recruitment';
            const category = await this.getTicketCategory(interaction.guild, categoryType);

            const config = this.getServerConfig(interaction.guild.id);
            const ticketViewerRoles = config.ticketViewerRoles || [];
            const notifyRoles = config.notifyRoles || [];
            const notifyMentions = notifyRoles.length > 0 
                ? notifyRoles.map(roleId => `<@&${roleId}>`).join(' ') 
                : '';

            const permissionOverwrites = [
                {
                    id: interaction.guild.id,
                    deny: [PermissionsBitField.Flags.ViewChannel]
                },
                {
                    id: interaction.user.id,
                    allow: [
                        PermissionsBitField.Flags.ViewChannel,
                        PermissionsBitField.Flags.SendMessages,
                        PermissionsBitField.Flags.ReadMessageHistory
                    ]
                },
                {
                    id: interaction.client.user.id,
                    allow: [
                        PermissionsBitField.Flags.ViewChannel,
                        PermissionsBitField.Flags.SendMessages,
                        PermissionsBitField.Flags.ManageChannels,
                        PermissionsBitField.Flags.ReadMessageHistory
                    ]
                }
            ];

            // Add roles that can view the tickets
            for (const roleId of ticketViewerRoles) {
                permissionOverwrites.push({
                    id: roleId,
                    allow: [
                        PermissionsBitField.Flags.ViewChannel,
                        PermissionsBitField.Flags.SendMessages,
                        PermissionsBitField.Flags.ReadMessageHistory
                    ]
                });
            }

            const ticketChannel = await interaction.guild.channels.create({
                name: `${isAranked ? 'aranked' : 'recrutamento'}-${username.toLowerCase()}`,
                type: ChannelType.GuildText,
                parent: category,
                permissionOverwrites
            });

            if (!ticketChannel) {
                console.error('Failed to create ticket channel');
                return null;
            }

            // Resto do código existente para criar embeds...
            const welcomeEmbed = new EmbedBuilder()
                .setColor('#2f3136')
                .setDescription(
                    '『 ✨ Bem-vindo ao seu ticket de recrutamento! 』\n\n' +
                    '> Por favor, aguarde. Um membro da nossa equipe irá atender você em breve.\n\n' +
                    '**Enquanto isso, nos conte um pouco sobre você:**\n\n' +
                    '```md\n' +
                    '1. Qual sua idade?\n' +
                    '2. Por que você quer entrar no nosso Clan?\n' +
                    '3. Quantas horas por dia você pode jogar?\n' +
                    '4. Tem experiência em outros clans?\n' +
                    '5. Você tem headset para call?\n' +
                    '```\n\n' +
                    '> ⏰ Tempo médio de espera: 5-10 minutos\n' +
                    '> 📢 Mencione um staff caso precise de ajuda\n' +
                    '> ❌ Não mencione outros membros da equipe'
                );

            const statsEmbed = new EmbedBuilder()
                .setTitle(`📋 Candidatura ${isAranked ? 'ARANKED' : ''} de ${username}`)
                .setColor(isAranked ? '#ff9900' : '#00ff00')
                .setThumbnail(interaction.guild.iconURL({ dynamic: true }))
                .addFields([
                    {
                        name: '『 Informações Gerais 』',
                        value: [
                            `➥ Discord: <@${interaction.user.id}>`,
                            `➥ Tipo de Conta: **${playerData.account.type === 'premium' ? 'Premium' : 'Cracked'}**`,
                            `➥ Tag: **${playerData.rank_tag?.name || 'Nenhuma'}**`,
                            `➥ Clan: **${playerData.clan?.name || 'Nenhum'}**`,
                            `➥ Primeira Conexão: <t:${Math.floor(playerData.first_login/1000)}:R>`,
                            `➥ Última Conexão: <t:${Math.floor(playerData.last_login/1000)}:R>`
                        ].join('\n'),
                        inline: false
                    },
                    {
                        name: '『 Estatísticas Principais 』',
                        value: [
                            `➥ Nível: ${(stats.level_badge?.format || '&7[0✫]').replace(/&[0-9a-fk-or]/g, '')}`,
                            `➥ FKDR: **${this.formatFKDR(stats.fkdr)}**`,
                            `➥ K/D: **${(stats.kills/stats.deaths).toFixed(2)}**`,
                            `➥ Win Rate: **${((stats.wins/stats.games_played)*100).toFixed(1)}%**`
                        ].join('\n'),
                        inline: false
                    },
                    {
                        name: '『 Conquistas 』',
                        value: [
                            `➥ Vitórias: **${stats.wins.toLocaleString()}**`,
                            `➥ Kills: **${stats.kills.toLocaleString()}**`,
                            `➥ Partidas: **${stats.games_played.toLocaleString()}**`,
                            `➥ Winstreak: **${stats.winstreak}**`,
                            `➥ Máximo Winstreak: **${stats.max_winstreak}**`
                        ].join('\n'),
                        inline: false
                    }
                ])
                .setFooter({ 
                    text: `${interaction.guild.name} - Sistema de Recrutamento`,
                    iconURL: interaction.guild.iconURL({ dynamic: true })
                })
                .setTimestamp();

            const closeButton = new ButtonBuilder()
                .setCustomId('close_ticket')
                .setLabel('🔒 Fechar Ticket')
                .setStyle(ButtonStyle.Danger);

            const row = new ActionRowBuilder().addComponents(closeButton);

            // Send initial message with all notification roles
            await ticketChannel.send({
                content: `<@${interaction.user.id}>${notifyMentions ? ` | ${notifyMentions}` : ''}`,
                embeds: [welcomeEmbed, statsEmbed],
                components: [row]
            });

            // Registrar o ticket
            this.addTicket(interaction.guild.id, interaction.user.id, ticketChannel.id);

            return ticketChannel;

        } catch (error) {
            console.error('Error creating recruitment ticket:', error);
            throw error;
        }
    }

    async handleButton(interaction) {
        if (!interaction.isButton()) return;

        try {
            switch (interaction.customId) {
                case 'apply_recruitment':
                    const recruitModal = new ModalBuilder()
                        .setCustomId('recruitment_modal')
                        .setTitle('Recrutamento para o Clan')
                        .addComponents(
                            new ActionRowBuilder().addComponents(
                                new TextInputBuilder()
                                    .setCustomId('username_input')
                                    .setLabel('Qual seu nickname no Mush?')
                                    .setStyle(TextInputStyle.Short)
                                    .setMinLength(3)
                                    .setMaxLength(16)
                                    .setPlaceholder('Digite seu nickname...')
                                    .setRequired(true)
                            )
                        );
                    await interaction.showModal(recruitModal);
                    break;

                case 'apply_aranked':
                    const arankedModal = new ModalBuilder()
                        .setCustomId('aranked_modal')
                        .setTitle('Recrutamento ARANKED')
                        .addComponents(
                            new ActionRowBuilder().addComponents(
                                new TextInputBuilder()
                                    .setCustomId('username_input')
                                    .setLabel('Qual seu nickname no Mush?')
                                    .setStyle(TextInputStyle.Short)
                                    .setMinLength(3)
                                    .setMaxLength(16)
                                    .setPlaceholder('Digite seu nickname...')
                                    .setRequired(true)
                            )
                        );
                    await interaction.showModal(arankedModal);
                    break;

                case 'cxc':
                    const cxcModal = new ModalBuilder()
                        .setCustomId('cxc-modal')
                        .setTitle('Clan x Clan')
                        .addComponents(
                            new ActionRowBuilder().addComponents(
                                new TextInputBuilder()
                                    .setCustomId('rules')
                                    .setLabel('Regras (ex: MD5, Aranked)')
                                    .setStyle(TextInputStyle.Short)
                                    .setPlaceholder('Digite as regras...')
                                    .setRequired(true)
                            ),
                            new ActionRowBuilder().addComponents(
                                new TextInputBuilder()
                                    .setCustomId('nick')
                                    .setLabel('Nick do Líder')
                                    .setStyle(TextInputStyle.Short)
                                    .setPlaceholder('Digite seu nickname...')
                                    .setRequired(true)
                            ),
                            new ActionRowBuilder().addComponents(
                                new TextInputBuilder()
                                    .setCustomId('clan')
                                    .setLabel('Nome do seu Clan')
                                    .setStyle(TextInputStyle.Short)
                                    .setPlaceholder('Digite o nome do clan...')
                                    .setRequired(true)
                            ),
                            new ActionRowBuilder().addComponents(
                                new TextInputBuilder()
                                    .setCustomId('line')
                                    .setLabel('Line-up (separar por vírgula)')
                                    .setStyle(TextInputStyle.Paragraph)
                                    .setPlaceholder('Digite os nicks da line-up...')
                                    .setRequired(true)
                            )
                        );
                    await interaction.showModal(cxcModal);
                    break;

                case 'parceria':
                    const parceriaModal = new ModalBuilder()
                        .setCustomId('parceria_modal')
                        .setTitle('Parceria')
                        .addComponents(
                            new ActionRowBuilder().addComponents(
                                new TextInputBuilder()
                                    .setCustomId('nick')
                                    .setLabel('Nick do Responsável')
                                    .setStyle(TextInputStyle.Short)
                                    .setRequired(true)
                            ),
                            new ActionRowBuilder().addComponents(
                                new TextInputBuilder()
                                    .setCustomId('discord_link')
                                    .setLabel('Link do Discord')
                                    .setStyle(TextInputStyle.Short)
                                    .setRequired(true)
                            )
                        );
                    await interaction.showModal(parceriaModal);
                    break;

                case 'close_ticket':
                    await this.handleCloseTicket(interaction);
                    break;

                case 'accept_cxc':
                    if (!interaction.member.permissions.has('ManageMessages')) {
                        return await interaction.reply({
                            content: '❌ Apenas staff pode aceitar CxCs!',
                            flags: 1 << 6
                        });
                    }

                    await interaction.deferReply({ flags: 1 << 6 });

                    // Get the original embed
                    const originalEmbed = interaction.message.embeds[0];
                    if (!originalEmbed) return;

                    // Create accepted version
                    const acceptedEmbed = EmbedBuilder.from(originalEmbed)
                        .setColor('#00ff00')
                        .setTitle(`${originalEmbed.title} (✅ ACEITO)`)
                        .addFields({
                            name: '『✅』Status',
                            value: `Aceito por <@${interaction.user.id}> em <t:${Math.floor(Date.now()/1000)}:R>`,
                            inline: false
                        });

                    // Disable all buttons
                    const closeButton = new ButtonBuilder()
                        .setCustomId('close_ticket')
                        .setLabel('🔒 Fechar Ticket')
                        .setStyle(ButtonStyle.Danger);

                    const row = new ActionRowBuilder().addComponents(closeButton);

                    await interaction.message.edit({
                        embeds: [acceptedEmbed],
                        components: [row]
                    });

                    await interaction.editReply({
                        content: '✅ CxC aceito com sucesso!',
                        flags: 1 << 6
                    });
                    break;

                case 'decline_cxc':
                    if (!interaction.member.permissions.has('ManageMessages')) {
                        return await interaction.reply({
                            content: '❌ Apenas staff pode recusar CxCs!',
                            flags: 1 << 6
                        });
                    }

                    await interaction.deferReply({ flags: 1 << 6 });

                    // Get the original embed
                    const originalDeclineEmbed = interaction.message.embeds[0];
                    if (!originalDeclineEmbed) return;

                    // Create declined version
                    const declinedEmbed = EmbedBuilder.from(originalDeclineEmbed)
                        .setColor('#ff0000')
                        .setTitle(`${originalDeclineEmbed.title} (❌ RECUSADO)`)
                        .addFields({
                            name: '『❌』Status',
                            value: `Recusado por <@${interaction.user.id}> em <t:${Math.floor(Date.now()/1000)}:R>`,
                            inline: false
                        });

                    // Add only close button
                    const closeButtonDeclined = new ButtonBuilder()
                        .setCustomId('close_ticket')
                        .setLabel('🔒 Fechar Ticket')
                        .setStyle(ButtonStyle.Danger);

                    const rowDeclined = new ActionRowBuilder().addComponents(closeButtonDeclined);

                    await interaction.message.edit({
                        embeds: [declinedEmbed],
                        components: [rowDeclined]
                    });

                    await interaction.editReply({
                        content: '❌ CxC recusado.',
                        flags: 1 << 6
                    });
                    break;

                default:
                    if (!interaction.replied) {
                        await interaction.reply({
                            content: '❌ Botão não reconhecido.',
                            flags: 1 << 6
                        });
                    }
                    break;
            }
        } catch (error) {
            console.error('Error handling button:', error);
            if (!interaction.replied && !interaction.deferred) {
                await interaction.reply({
                    content: '❌ Ocorreu um erro ao processar sua solicitação.',
                    flags: 1 << 6
                });
            }
        }
    }

    async handleArankedModal(interaction) {
        try {
            await interaction.deferReply({ flags: 1 << 6 });
            
            const username = interaction.fields.getTextInputValue('username_input');
            
            // Check existing ticket
            const existingTicketId = await this.checkExistingTicket(interaction.guild, interaction.user.id);
            if (existingTicketId) {
                return await interaction.editReply({
                    content: `❌ Você já possui um ticket aberto! <#${existingTicketId}>`,
                    flags: 1 << 6
                });
            }

            try {
                const response = await axios.get(`https://mush.com.br/api/player/${username}`);
                const playerData = response.data?.response;

                if (!playerData) {
                    return await interaction.editReply({
                        content: '❌ Jogador não encontrado!',
                        flags: 1 << 6
                    });
                }

                // Verificar vinculação do Discord antes de prosseguir
                if (!this.isDiscordLinked(playerData, interaction.user.id)) {
                    return await interaction.editReply({
                        content: '❌ Esta conta não está vinculada ao seu Discord!\nUse `/discord` no servidor do Mush para vincular.',
                        flags: 1 << 6
                    });
                }

                const bedwarsStats = playerData.stats?.bedwars;

                if (!bedwarsStats) {
                    return await interaction.editReply({
                        content: '❌ Estatísticas não encontradas para este jogador.',
                        flags: 1 << 6
                    });
                }

                // Check ARANKED requirements
                if (bedwarsStats.fkdr < 500 || bedwarsStats.level < 50) {
                    return await interaction.editReply({
                        content: '❌ Você não atende os requisitos mínimos para ARANKED!\n' +
                                '> Requisitos:\n' +
                                '> • FKDR mínimo: 5.00\n' +
                                '> • Level mínimo: 50',
                        flags: 1 << 6
                    });
                }

                // Create ticket
                const ticketChannel = await this.createRecruitmentTicket(
                    interaction,
                    username,
                    bedwarsStats,
                    playerData,
                    true
                );

                if (!ticketChannel) {
                    return await interaction.editReply({
                        content: '❌ Erro ao criar o canal do ticket.',
                        flags: 1 << 6
                    });
                }

                this.addTicket(interaction.guild.id, interaction.user.id, ticketChannel.id);
                
                return await interaction.editReply({
                    content: `✅ Seu ticket ARANKED foi criado! Canal: <#${ticketChannel.id}>`,
                    flags: 1 << 6
                });

            } catch (error) {
                console.error('Error fetching player data:', error);
                return await interaction.editReply({
                    content: '❌ Erro ao buscar dados do jogador. Verifique se o nickname está correto.',
                    flags: 1 << 6
                });
            }
        } catch (error) {
            console.error('Error in ARANKED modal:', error);
            if (interaction.replied || interaction.deferred) {
                return await interaction.editReply({
                    content: '❌ Erro ao processar sua solicitação ARANKED.',
                    flags: 1 << 6
                });
            }
            return await interaction.reply({
                content: '❌ Erro ao processar sua solicitação ARANKED.',
                flags: 1 << 6
            });
        }
    }

    // Fix the getTicketCategory method
    async getTicketCategory(guild, type = 'recruitment') {
        try {
            const categoryNames = this.defaultSettings.ticketCategories;
            const categoryName = categoryNames[type] || 'TICKETS';
            
            // Check cache first
            let category = guild.channels.cache.find(c => 
                c.type === ChannelType.GuildCategory && 
                c.name === categoryName
            );

            // If not found, create it
            if (!category) {
                category = await guild.channels.create({
                    name: categoryName,
                    type: ChannelType.GuildCategory,
                    permissionOverwrites: [
                        {
                            id: guild.id,
                            deny: [PermissionsBitField.Flags.ViewChannel]
                        },
                        {
                            id: guild.client.user.id,
                            allow: [
                                PermissionsBitField.Flags.ViewChannel,
                                PermissionsBitField.Flags.SendMessages,
                                PermissionsBitField.Flags.ManageChannels
                            ]
                        }
                    ]
                });
            }
            return category;
        } catch (error) {
            console.error(`Error getting ticket category for ${guild.name}:`, error);
            throw new Error('Failed to get or create ticket category');
        }
    }

    async handleCxCModal(interaction) {
        try {
            await interaction.deferReply({ flags: 1 << 6 });
            
            // Get form inputs
            const rules = interaction.fields.getTextInputValue('rules')?.trim();
            const nick = interaction.fields.getTextInputValue('nick')?.trim();
            const clanName = interaction.fields.getTextInputValue('clan')?.trim();
            const lineup = interaction.fields.getTextInputValue('line')?.split(',').map(p => p.trim());

            // Validate inputs
            if (!rules || !nick || !clanName || !lineup || lineup.length === 0) {
                return await interaction.editReply({
                    content: '❌ Por favor, preencha todos os campos corretamente.',
                    flags: 1 << 6
                });
            }

            // Check for existing ticket
            const existingTicketId = await this.checkExistingTicket(interaction.guild, interaction.user.id);
            if (existingTicketId) {
                return await interaction.editReply({
                    content: `❌ Você já possui um ticket aberto! <#${existingTicketId}>`,
                    flags: 1 << 6
                });
            }

            // Create CxC category
            const category = await this.getTicketCategory(interaction.guild, 'cxc');
            
            // Create ticket channel
            const ticketChannel = await interaction.guild.channels.create({
                name: `cxc-${nick.toLowerCase()}`,
                type: ChannelType.GuildText,
                parent: category,
                permissionOverwrites: [
                    {
                        id: interaction.guild.id,
                        deny: [PermissionsBitField.Flags.ViewChannel]
                    },
                    {
                        id: interaction.user.id,
                        allow: [
                            PermissionsBitField.Flags.ViewChannel,
                            PermissionsBitField.Flags.SendMessages,
                            PermissionsBitField.Flags.ReadMessageHistory
                        ]
                    },
                    {
                        id: interaction.client.user.id,
                        allow: [
                            PermissionsBitField.Flags.ViewChannel,
                            PermissionsBitField.Flags.SendMessages,
                            PermissionsBitField.Flags.ManageChannels
                        ]
                    }
                ]
            });

            // Get lineup stats
            const lineupStats = await this.processCxCLineup(lineup);

            // Create CxC embed
            const embed = new EmbedBuilder()
                .setTitle(`『⚔️』Clan x Clan - ${clanName}`)
                .setColor('#ff0000')
                .addFields([
                    {
                        name: '『👑』Organizador',
                        value: `<@${interaction.user.id}> (${nick})`,
                        inline: true
                    },
                    {
                        name: '『🛡️』Clan',
                        value: clanName,
                        inline: true
                    },
                    {
                        name: '『📋』Regras',
                        value: rules,
                        inline: false
                    },
                    {
                        name: '『👥』Line-up',
                        value: lineupStats.map(player => 
                            `• ${player.username} (${player.clan ? player.clan.name : 'Sem Clan'})\n` +
                            `➥ Nível: ${player.bedwars.level}\n` +
                            `➥ FKDR: ${player.bedwars.fkdr}\n` +
                            `➥ WS: ${player.bedwars.winstreak}\n`
                        ).join('\n') || 'Nenhum jogador encontrado',
                        inline: false
                    }
                ])
                .setThumbnail(interaction.guild.iconURL({ dynamic: true }))
                .setFooter({ 
                    text: `${interaction.guild.name} • Sistema de CxC`,
                    iconURL: interaction.guild.iconURL({ dynamic: true })
                })
                .setTimestamp();

            // Add buttons
            const closeButton = new ButtonBuilder()
                .setCustomId('close_ticket')
                .setLabel('🔒 Fechar Ticket')
                .setStyle(ButtonStyle.Danger);

            const acceptButton = new ButtonBuilder()
                .setCustomId('accept_cxc')
                .setLabel('✅ Aceitar')
                .setStyle(ButtonStyle.Success);

            const declineButton = new ButtonBuilder()
                .setCustomId('decline_cxc')
                .setLabel('❌ Recusar')
                .setStyle(ButtonStyle.Secondary);

            const row = new ActionRowBuilder()
                .addComponents(acceptButton, declineButton, closeButton);

            // Send initial message
            await ticketChannel.send({
                content: `<@${interaction.user.id}> | <@&${interaction.guild.roles.cache.find(r => r.name.toLowerCase().includes('staff'))?.id || ''}>`,
                embeds: [embed],
                components: [row]
            });

            // Register ticket
            this.addTicket(interaction.guild.id, interaction.user.id, ticketChannel.id);

            // Reply to user
            return await interaction.editReply({
                content: `✅ Ticket CxC criado com sucesso! Canal: <#${ticketChannel.id}>`,
                flags: 1 << 6
            });

        } catch (error) {
            console.error('Error in CxC modal:', error);
            const response = {
                content: '❌ Erro ao criar ticket CxC.',
                flags: 1 << 6
            };

            if (interaction.replied || interaction.deferred) {
                return await interaction.editReply(response);
            }
            return await interaction.reply(response);
        }
    }

    async handleCloseTicket(interaction) {
        try {
            // Check permissions first
            if (!interaction.member.permissions.has('ManageChannels')) {
                return await interaction.reply({
                    content: '❌ Apenas staff pode fechar tickets!',
                    flags: 1 << 6
                }).catch(() => null);
            }

            // Find ticket owner before any async operations
            const ticketOwner = Object.entries(this.tickets[interaction.guild.id] || {})
                .find(([userId, channelId]) => channelId === interaction.channel.id);

            // Send initial response
            await interaction.reply({
                content: '🔒 Fechando ticket em 5 segundos...',
                flags: 1 << 6
            }).catch(() => null);

            // Remove from tracking if exists
            if (ticketOwner) {
                const [userId] = ticketOwner;
                this.removeTicket(interaction.guild.id, userId);
            }

            // Delete channel after delay
            setTimeout(() => {
                interaction.channel.delete()
                    .catch(error => console.error('Error deleting channel:', error));
            }, 5000);

        } catch (error) {
            console.error('Error closing ticket:', error);
            // Don't try to reply if there's an error, as the interaction might have expired
        }
    }

    async handleRecruitmentModal(interaction) {
        try {
            await interaction.deferReply({ flags: 1 << 6 });
            
            const username = interaction.fields.getTextInputValue('username_input');

            // Verificar ticket existente
            const existingTicketId = await this.checkExistingTicket(interaction.guild, interaction.user.id);
            if (existingTicketId) {
                return await interaction.editReply({
                    content: `❌ Você já possui um ticket aberto! <#${existingTicketId}>`,
                    flags: 1 << 6
                });
            }

            // Buscar dados do jogador
            try {
                const response = await axios.get(`https://mush.com.br/api/player/${username}`);
                const playerData = response.data?.response;

                if (!playerData) {
                    return await interaction.editReply({
                        content: '❌ Jogador não encontrado!',
                        flags: 1 << 6
                    });
                }

                // Verificar vinculação do Discord antes de prosseguir
                if (!this.isDiscordLinked(playerData, interaction.user.id)) {
                    return await interaction.editReply({
                        content: '❌ Esta conta não está vinculada ao seu Discord!\nUse `/discord` no servidor do Mush para vincular.',
                        flags: 1 << 6
                    });
                }

                // Verificar estatísticas
                const bedwarsStats = playerData.stats?.bedwars;
                if (!bedwarsStats) {
                    return await interaction.editReply({
                        content: '❌ Não foi possível encontrar suas estatísticas de Bedwars.',
                        flags: 1 << 6
                    });
                }

                // Verificar requisitos
                const config = this.getServerConfig(interaction.guild.id);
                if (bedwarsStats.fkdr < config.minFKDR || bedwarsStats.level < config.minLevel) {
                    return await interaction.editReply({
                        content: `❌ Você não atende os requisitos mínimos!\n` +
                                `> Requisitos:\n` +
                                `> • FKDR mínimo: ${config.minFKDR}\n` +
                                `> • Level mínimo: ${config.minLevel}`,
                        flags: 1 << 6
                    });
                }

                // Criar ticket
                const ticketChannel = await this.createRecruitmentTicket(
                    interaction,
                    username,
                    bedwarsStats,
                    playerData,
                    false
                );

                if (!ticketChannel) {
                    return await interaction.editReply({
                        content: '❌ Erro ao criar o canal do ticket.',
                        flags: 1 << 6
                    });
                }

                this.addTicket(interaction.guild.id, interaction.user.id, ticketChannel.id);

                return await interaction.editReply({
                    content: `✅ Seu ticket foi criado! Canal: <#${ticketChannel.id}>`,
                    flags: 1 << 6
                });

            } catch (error) {
                console.error('Error fetching player data:', error);
                return await interaction.editReply({
                    content: '❌ Erro ao buscar dados do jogador. Verifique se o nickname está correto.',
                    flags: 1 << 6
                });
            }
        } catch (error) {
            console.error('Error in recruitment modal:', error);
            const response = {
                content: '❌ Erro ao processar sua solicitação.',
                flags: 1 << 6
            };

            if (interaction.replied || interaction.deferred) {
                return await interaction.editReply(response);
            }
            return await interaction.reply(response);
        }
    }

    isDiscordLinked(playerData, discordId) {
        try {
            // Verificações mais seguras
            if (!playerData) return false;
            if (!playerData.discord) return false;
            if (!playerData.discord.id) return false;
            
            // Garantir que ambos são strings para comparação
            const playerDiscordId = String(playerData.discord.id);
            const requestDiscordId = String(discordId);
            
            return playerDiscordId === requestDiscordId;
        } catch (error) {
            console.error('Error checking Discord link:', error);
            return false;
        }
    }

    async processCxCLineup(lineup) {
        if (!Array.isArray(lineup)) return [];
        
        const lineupStats = [];
        const promises = lineup.map(async (playerName) => {
            try {
                const cleanName = playerName.trim();
                if (!cleanName) return null;

                const response = await axios.get(`https://mush.com.br/api/player/${cleanName}`);
                if (!response.data?.response?.account) return null;

                const playerStats = response.data.response;
                const bedwarsStats = playerStats.stats?.bedwars || {};
                
                return {
                    username: playerStats.account.username,
                    clan: playerStats.clan,
                    bedwars: {
                        level: bedwarsStats.level || 0,
                        wins: bedwarsStats.wins || 0,
                        kills: bedwarsStats.kills || 0,
                        fkdr: this.formatFKDR(bedwarsStats.fkdr || 0),
                        winstreak: bedwarsStats.winstreak || 0,
                        max_winstreak: bedwarsStats.max_winstreak || 0
                    }
                };
            } catch (error) {
                console.error(`Error fetching player ${playerName}:`, error);
                return null;
            }
        });

        try {
            const results = await Promise.all(promises);
            return results.filter(result => result !== null);
        } catch (error) {
            console.error('Error processing lineup:', error);
            return [];
        }
    }

    formatFKDR(fkdr) {
        // Convert FKDR from integer format (e.g. 500 = 5.00)
        if (typeof fkdr === 'number' && fkdr >= 100) {
            return (fkdr / 100).toFixed(2);
        }
        // Handle already decimal format
        return Number(fkdr).toFixed(2);
    }

    convertFKDR(fkdr) {
        // Convert FKDR to decimal (e.g. 547 -> 5.47)
        if (fkdr >= 100) {
            return Number((fkdr / 100).toFixed(2));
        }
        return Number(fkdr);
    }

    getServerConfig(guildId) {
        if (!this.serverConfigs[guildId]) {
            this.serverConfigs[guildId] = {
                minFkdr: 2.00,
                minLevel: 20,
                ticketViewerRoles: [],
                notifyRoleId: null, // Role to notify when a ticket is created
                customMessages: {},
                lastEditedChannel: null
            };
            this.saveServerConfigs();
        }
        return this.serverConfigs[guildId];
    }

    updateServerConfig(guildId, newConfig) {
        this.serverConfigs[guildId] = {
            ...this.getServerConfig(guildId),
            ...newConfig
        };
        this.saveServerConfigs();
    }
    
    async handlePanelEditModal(interaction) {
        try {
            await interaction.deferReply({ ephemeral: true });
            
            // Obter todos os valores do modal
            const title = interaction.fields.getTextInputValue('title_input');
            const description = interaction.fields.getTextInputValue('description_input');
            const rules = interaction.fields.getTextInputValue('rules_input');
            const additionalRules = interaction.fields.getTextInputValue('additional_rules_input');
            const options = interaction.fields.getTextInputValue('options_input');

            // Criar o embed atualizado
            const embed = new EmbedBuilder()
                .setTitle(title)
                .setDescription(description)
                .setColor('#ff5555')
                .addFields([
                    {
                        name: '<:Icon_Channel_Rules:1325512517820219453> REGRAS DA ARANKED',
                        value: rules,
                        inline: false
                    },
                    {
                        name: '『 REGRAS ADICIONAIS 』',
                        value: additionalRules,
                        inline: false
                    },
                    {
                        name: '『 OPÇÕES DISPONÍVEIS 』',
                        value: options,
                        inline: false
                    }
                ])
                .setThumbnail(interaction.guild.iconURL({ dynamic: true, size: 256 }))
                .setFooter({ 
                    text: `${interaction.guild.name} - Desenvolvido por Rezando.`,
                    iconURL: interaction.guild.iconURL({ dynamic: true })
                });

            // Configurar os botões
            const row = new ActionRowBuilder()
                .addComponents(
                    new ButtonBuilder()
                        .setCustomId('cxc')
                        .setLabel('Clan x Clan')
                        .setEmoji('<:diamond_sword:1325512395027648553>')
                        .setStyle(ButtonStyle.Primary),
                    new ButtonBuilder()
                        .setCustomId('parceria')
                        .setLabel('Parceria')
                        .setEmoji('<a:Spinning_Nether_Star:1318567273576927292>')
                        .setStyle(ButtonStyle.Secondary),
                    new ButtonBuilder()
                        .setCustomId('apply_recruitment')
                        .setLabel('📝 Candidatar-se')
                        .setStyle(ButtonStyle.Success),
                    new ButtonBuilder()
                        .setCustomId('apply_aranked')
                        .setLabel('👑 ARANKED')
                        .setStyle(ButtonStyle.Primary)
                );

            // Encontrar e atualizar a mensagem
            let targetChannel = interaction.channel;
            const lastEditedChannelId = this.getLastEditedChannel(interaction.guildId);
            if (lastEditedChannelId) {
                targetChannel = await interaction.guild.channels.fetch(lastEditedChannelId)
                    .catch(() => interaction.channel);
            }

            const messages = await targetChannel.messages.fetch({ limit: 50 });
            const targetMessage = messages.find(msg => 
                msg.author.id === interaction.client.user.id && 
                msg.embeds.length > 0
            );

            if (targetMessage) {
                await targetMessage.edit({ embeds: [embed], components: [row] });
                await interaction.editReply({ content: '✅ Painel atualizado com sucesso!', ephemeral: true });
            } else {
                const newMessage = await targetChannel.send({ embeds: [embed], components: [row] });
                await interaction.editReply({ content: '✅ Novo painel criado com sucesso!', ephemeral: true });
            }

            // Salvar o conteúdo
            const contentToSave = {
                title,
                description,
                rules,
                additionalRules,
                options,
                type: 'admin_panel'
            };
            
            this.saveServerPanelContent(interaction.guildId, contentToSave);

        } catch (error) {
            console.error('Erro ao editar painel:', error);
            await interaction.editReply({
                content: '❌ Ocorreu um erro ao editar o painel.',
                ephemeral: true
            }).catch(console.error);
        }
    }

    async getPanelContent(guildId) {
        try {
            const inMemoryContent = this.messages[guildId]?.lastMessage?.content;
            if (inMemoryContent) return inMemoryContent;

            if (fs.existsSync(this.panelMessagesFile)) {
                const data = JSON.parse(fs.readFileSync(this.panelMessagesFile, 'utf8'));
                if (data[guildId]) return data[guildId];
            }

            const serverConfig = this.getServerConfig(guildId);
            if (serverConfig.panelContent) return serverConfig.panelContent;
        } catch (error) {
            console.error('Error loading panel content:', error);
        }
        return null;
    }

    async savePanelContent(guildId, content) {
        try {
            if (!this.messages[guildId]) this.messages[guildId] = {};
            this.messages[guildId].lastMessage = { content };

            let data = {};
            if (fs.existsSync(this.panelMessagesFile)) {
                data = JSON.parse(fs.readFileSync(this.panelMessagesFile, 'utf8'));
            }
            data[guildId] = content;
            fs.writeFileSync(this.panelMessagesFile, JSON.stringify(data, null, 2));

            const config = this.getServerConfig(guildId);
            config.panelContent = content;
            this.updateServerConfig(guildId, config);
        } catch (error) {
            console.error('Error saving panel content:', error);
        }
    }

    setLastEditedChannel(guildId, channelId) {
        if (!this.messages[guildId]) this.messages[guildId] = {};
        this.messages[guildId].lastEditedChannel = channelId;
        this.saveMessages();
    }

    getLastEditedChannel(guildId) {
        return this.messages[guildId]?.lastEditedChannel;
    }

    saveLastMessage(guildId, messageId, content) {
        if (!this.messages[guildId]) {
            this.messages[guildId] = {};
        }
        this.messages[guildId].lastMessage = {
            id: messageId,
            content: content,
            type: content.type || 'admin_panel'
        };
        this.saveMessages();
    }

    saveServerPanelContent(guildId, content) {
        try {
            if (!this.messages[guildId]) {
                this.messages[guildId] = {};
            }
            
            if (!this.messages[guildId].panels) {
                this.messages[guildId].panels = {};
            }

            this.messages[guildId].panels.content = content;
            this.saveMessages();

            return true;
        } catch (error) {
            console.error('Error saving panel content:', error);
            return false;
        }
    }

    getServerPanelContent(guildId) {
        try {
            return this.messages[guildId]?.panels?.content || null;
        } catch (error) {
            console.error('Error getting panel content:', error);
            return null;
        }
    }
    
    // ...rest of existing methods...
}

module.exports = RecruitmentManager;
