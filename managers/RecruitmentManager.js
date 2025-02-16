const { 
    EmbedBuilder, 
    ActionRowBuilder, 
    ButtonBuilder, 
    ButtonStyle, 
    ModalBuilder, 
    TextInputBuilder, 
    TextInputStyle, 
    ChannelType,
    PermissionsBitField // Add this import
} = require('discord.js');
const axios = require('../utils/axios'); // Usar a instância configurada
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
        this.panelMessages = {}; // Adicionar esta linha
        this.panelMessagesFile = path.join(this.configDir, 'panel-messages.json');
        this.serverConfigs = {};
        this.configsFile = path.join(this.configDir, 'server-configs.json');
        this.ensureConfigDir();
        this.loadTickets();
        this.loadMessages();
        this.loadPanelMessages();
        this.loadServerConfigs();
    }

    ensureConfigDir() {
        if (!fs.existsSync(this.configDir)) {
            fs.mkdirSync(this.configDir, { recursive: true });
        }
    }

    loadTickets() {
        try {
            if (fs.existsSync(this.ticketsFile)) {
                this.tickets = JSON.parse(fs.readFileSync(this.ticketsFile, 'utf8'));
            }
        } catch (error) {
            console.error('Error loading tickets:', error);
        }
    }

    saveTickets() {
        try {
            fs.writeFileSync(this.ticketsFile, JSON.stringify(this.tickets, null, 2));
        } catch (error) {
            console.error('Error saving tickets:', error);
        }
    }

    // Novo método para carregar mensagens por servidor
    loadMessages() {
        try {
            if (fs.existsSync(this.messagesFile)) {
                this.messages = JSON.parse(fs.readFileSync(this.messagesFile, 'utf8'));
            }
        } catch (error) {
            console.error('Error loading messages:', error);
        }
    }

    // Novo método para salvar mensagens por servidor
    saveMessages() {
        try {
            fs.writeFileSync(this.messagesFile, JSON.stringify(this.messages, null, 2));
        } catch (error) {
            console.error('Error saving messages:', error);
        }
    }

    // Novo método para salvar última mensagem editada
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

    // Novo método para obter última mensagem
    getLastMessage(guildId) {
        return this.messages[guildId]?.lastMessage;
    }

    getConfigPath(guildId) {
        return path.join(this.configDir, `${guildId}.json`);
    }

    loadConfig(guildId) {
        const configPath = this.getConfigPath(guildId);
        try {
            if (fs.existsSync(configPath)) {
                return JSON.parse(fs.readFileSync(configPath, 'utf8'));
            }
        } catch (error) {
            console.error(`Error loading recruitment config for guild ${guildId}:`, error);
        }
        return {
            minFKDR: 2.0,
            minLevel: 20,
            messages: {
                recruitment: 'Por favor, responda as perguntas abaixo para se candidatar.',
                aranked: 'Por favor, responda as perguntas abaixo para se candidatar como ARANKED.'
            }
        };
    }

    saveConfig(guildId, config) {
        const configPath = this.getConfigPath(guildId);
        try {
            fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
        } catch (error) {
            console.error(`Error saving recruitment config for guild ${guildId}:`, error);
        }
    }

    async setupRecruitmentPanel(channel) {
        const config = this.loadConfig(channel.guild.id);
        const embed = new EmbedBuilder()
            .setTitle(`<:Mush:1325298452812271676> Recrutamento - ${channel.guild.name}`)
            .setColor('#00ff00')
            .setThumbnail(channel.guild.iconURL({ dynamic: true, size: 256 }))
            .setDescription([
                '### 📋 Requisitos para Recrutamento\n',
                '> Para se juntar à equipe, você precisa:',
                `• FKDR mínimo: **${config.minFKDR}**`,
                `• Nível mínimo: **${config.minLevel}**\n`,
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
            .setLabel('📝 Candidatar-se')
            .setStyle(ButtonStyle.Success);

        const arankedButton = new ButtonBuilder()
            .setCustomId('apply_aranked')
            .setLabel('👑 ARANKED')
            .setStyle(ButtonStyle.Primary);

        const row = new ActionRowBuilder().addComponents(normalButton, arankedButton);
        return channel.send({ embeds: [embed], components: [row] });
    }

    async setupRecruitmentSection(embed, components) {
        if (!this.requirements) {
            this.requirements = {
                minFKDR: 2.0,
                minLevel: 20
            };
        }

        embed.addFields({
            name: '『 📋 Recrutamento 』',
            value: [
                '> Para se juntar à equipe, você precisa:',
                `• FKDR mínimo: **${this.requirements.minFKDR}**`,
                `• Nível mínimo: **${this.requirements.minLevel}**`,
                '### ⚠️ Informações Importantes',
                '• Sua conta do Discord deve estar vinculada ao Mush.',
                '• Você deve ter jogado nas últimas 24 horas.',
                '• Apenas um recrutamento por vez é permitido.',
            ].join('\n'),
            inline: false
        });

        const recruitmentRow = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId('apply_recruitment')
                    .setLabel('📝 Candidatar-se')
                    .setStyle(ButtonStyle.Success),
                new ButtonBuilder()
                    .setCustomId('apply_aranked')
                    .setLabel('👑 ARANKED')
                    .setStyle(ButtonStyle.Primary)
            );

        components.push(recruitmentRow);
    }

    setRequirements(requirements) {
        this.requirements = requirements;
        // Salvar configurações em arquivo
        try {
            fs.mkdirSync(path.dirname(this.configPath), { recursive: true });
            fs.writeFileSync(this.configPath, JSON.stringify(requirements, null, 2));
        } catch (error) {
            console.error('Error saving recruitment config:', error);
        }
    }

    async handleRecruitmentButton(interaction) {
        try {
            const modal = new ModalBuilder()
                .setCustomId('recruitment_modal')
                .setTitle('Candidatura para Recrutamento');

            const usernameInput = new TextInputBuilder()
                .setCustomId('username_input')
                .setLabel('Qual seu nome de Nickname?')
                .setStyle(TextInputStyle.Short)
                .setMinLength(3)
                .setMaxLength(16)
                .setPlaceholder('Insira seu NICKNAME AQUI')
                .setRequired(true);

            modal.addComponents(new ActionRowBuilder().addComponents(usernameInput));

            return await interaction.showModal(modal);
        } catch (error) {
            console.error('Error in recruitment button:', error);
            throw error; // Let the main handler catch it
        }
    }

    async handleArankedRecruitment(interaction) {
        try {
            const modal = new ModalBuilder()
                .setCustomId('aranked_modal')
                .setTitle('Candidatura ARANKED');

            const usernameInput = new TextInputBuilder()
                .setCustomId('username_input')
                .setLabel('Qual seu nickname?')
                .setStyle(TextInputStyle.Short)
                .setMinLength(3)
                .setMaxLength(16)
                .setPlaceholder('Digite seu nickname')
                .setRequired(true);

            modal.addComponents(new ActionRowBuilder().addComponents(usernameInput));

            await interaction.showModal(modal);
        } catch (error) {
            console.error('Error in aranked recruitment:', error);
            if (!interaction.replied && !interaction.deferred) {
                await interaction.reply({
                    content: '❌ Erro ao abrir o formulário ARANKED.',
                    ephemeral: true
                });
            }
        }
    }

    async checkExistingTicket(guild, userId) {
        const guildTickets = this.tickets[guild.id] || {};
        const channelId = guildTickets[userId];
        
        if (!channelId) return null;

        // Check if channel still exists
        try {
            const channel = await guild.channels.fetch(channelId);
            if (channel) return channelId;
        } catch (error) {
            // If channel doesn't exist, remove the ticket
            this.removeTicket(guild.id, userId);
            return null;
        }
        
        return null;
    }

    async handleRecruitmentModal(interaction) {
        try {
            await interaction.deferReply({ ephemeral: true });
            const username = interaction.fields.getTextInputValue('username_input');
            
            // Verificar ticket existente
            const existingTicket = await this.checkExistingTicket(interaction.guild, interaction.user.id);
            if (existingTicket) {
                return await interaction.editReply({
                    content: `❌ Você já possui um ticket aberto! Por favor, utilize o canal <#${existingTicket.id}> ou aguarde ele ser fechado.`,
                    ephemeral: true
                });
            }

            // Buscar dados do jogador
            let playerData;
            try {
                const response = await axios.get(`https://mush.com.br/api/player/${username}`);
                playerData = response.data.response;
            } catch (error) {
                return await interaction.editReply({
                    content: '❌ Não foi possível encontrar o jogador. Verifique se o nickname está correto.',
                    ephemeral: true
                });
            }
            
            // Verificar vinculação do Discord
            if (!this.isDiscordLinked(playerData, interaction.user.id)) {
                return await interaction.editReply({
                    content: '❌ O Nickname inserido não está vinculado ao seu Discord!\nPor favor, vincule sua conta primeiro usando `/discord` no servidor do Mush.',
                    ephemeral: true
                });
            }

            // Criar ticket
            try {
                const ticketChannel = await this.createRecruitmentTicket(interaction, username, playerData.stats.bedwars, playerData);
                this.addTicket(interaction.guild.id, interaction.user.id, ticketChannel.id);
                
                return await interaction.editReply({
                    content: `✅ Seu ticket foi criado com sucesso! Canal: <#${ticketChannel.id}>`,
                    ephemeral: true
                });
            } catch (error) {
                console.error('Erro ao criar ticket:', error);
                return await interaction.editReply({
                    content: '❌ Ocorreu um erro ao criar seu ticket. Por favor, tente novamente.',
                    ephemeral: true
                });
            }

        } catch (error) {
            console.error('Erro no processamento:', error);
            if (interaction.deferred) {
                await interaction.editReply({
                    content: '❌ Ocorreu um erro ao processar sua solicitação.',
                    ephemeral: true
                }).catch(console.error);
            }
        }
    }

    async safeInteractionReply(interaction, content, options = {}) {
        try {
            if (!interaction.replied && !interaction.deferred) {
                return await interaction.reply({ content, ...options });
            } else {
                return await interaction.editReply({ content, ...options });
            }
        } catch (error) {
            console.error('Erro ao responder interação:', error);
            return false;
        }
    }

    // Atualizar o método handleArankedModal para usar o novo sistema seguro
    async handleArankedModal(interaction) {
        try {
            await interaction.deferReply({ ephemeral: true });
            
            const username = interaction.fields.getTextInputValue('username_input');
            
            const existingTicket = await this.checkExistingTicket(interaction.guild, interaction.user.id);
            if (existingTicket) {
                return await interaction.editReply({
                    content: `❌ Você já possui um ticket aberto! Por favor, utilize o canal <#${existingTicket.id}> ou aguarde ele ser fechado.`,
                    ephemeral: true
                });
            }

            let playerData;
            try {
                const response = await axios.get(`https://mush.com.br/api/player/${username}`);
                playerData = response.data.response;
            } catch (error) {
                return await interaction.editReply({
                    content: '❌ Não foi possível encontrar o jogador. Verifique se o nickname está correto.',
                    ephemeral: true
                });
            }

            if (!this.isDiscordLinked(playerData, interaction.user.id)) {
                return await interaction.editReply({
                    content: '❌ O Nickname inserido não está vinculado ao seu Discord!\nPor favor, vincule sua conta primeiro usando `/discord` no servidor do Mush.',
                    ephemeral: true
                });
            }

            const ticketChannel = await this.createRecruitmentTicket(
                interaction,
                username,
                playerData.stats.bedwars,
                playerData,
                true // isAranked = true
            );

            if (ticketChannel) {
                this.addTicket(interaction.guild.id, interaction.user.id, ticketChannel.id);
                await interaction.editReply({
                    content: `✅ Seu ticket ARANKED foi criado com sucesso! Canal: <#${ticketChannel.id}>`,
                    ephemeral: true
                });
            }

        } catch (error) {
            console.error('Erro no processamento ARANKED:', error);
            if (interaction.deferred) {
                await interaction.editReply({
                    content: '❌ Ocorreu um erro ao processar sua solicitação ARANKED.',
                    ephemeral: true
                });
            }
        }
    }

    async handlePanelEditModal(interaction) {
        try {
            await interaction.deferReply({ ephemeral: true });

            // Carregar conteúdo salvo do servidor
            const savedContent = this.panelMessages[interaction.guildId] || {};
            
            // Obter valores dos campos
            const rules = interaction.fields.getTextInputValue('rules_input') || savedContent?.rules || 'Regras padrão da ARANKED';
            const additionalRules = interaction.fields.getTextInputValue('additional_rules_input') || savedContent?.additionalRules || 'Regras adicionais padrão';
            const options = interaction.fields.getTextInputValue('options_input') || savedContent?.options || 'Opções padrão';

            // Criar o embed atualizado
            const embed = new EmbedBuilder()
                .setTitle('『 PAINEL DE ADMINISTRAÇÃO 』')
                .setDescription('Selecione uma das opções abaixo para criar um ticket.')
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

            // Buscar mensagem existente de forma mais robusta
            let messageToEdit;
            const lastMessageId = this.getLastMessage(interaction.guildId)?.id;

            if (lastMessageId) {
                try {
                    messageToEdit = await interaction.channel.messages.fetch(lastMessageId);
                } catch (error) {
                    console.error('Erro ao buscar a última mensagem:', error);
                }
            }

            if (!messageToEdit) {
                const messages = await interaction.channel.messages.fetch({ limit: 50 });
                messageToEdit = messages.find(msg => 
                    msg.author.id === interaction.client.user.id && 
                    msg.embeds.length > 0 &&
                    msg.embeds[0].title === '『 PAINEL DE ADMINISTRAÇÃO 』'
                );
            }

            const contentToSave = {
                rules,
                additionalRules,
                options,
                type: 'admin_panel'
            };

            if (messageToEdit) {
                await messageToEdit.edit({ embeds: [embed], components: [row] });
                this.saveServerPanelContent(interaction.guildId, contentToSave);
                this.saveLastMessage(interaction.guildId, messageToEdit.id, contentToSave);
                await interaction.editReply({ content: '✅ Painel atualizado com sucesso!' });
            } else {
                const newMessage = await interaction.channel.send({ embeds: [embed], components: [row] });
                this.saveServerPanelContent(interaction.guildId, contentToSave);
                this.saveLastMessage(interaction.guildId, newMessage.id, contentToSave);
                await interaction.editReply({ content: '✅ Novo painel criado com sucesso!' });
            }

        } catch (error) {
            console.error('Erro ao editar painel:', error);
            await interaction.editReply({
                content: '❌ Ocorreu um erro ao editar o painel. Por favor, tente novamente.'
            }).catch(console.error);
        }
    }

    async handleAdminCxCModal(interaction) {
        try {
            await interaction.deferReply({ ephemeral: true });

            const title = interaction.fields.getTextInputValue('title_input');
            const requirements = interaction.fields.getTextInputValue('requirements_input');
            const rules = interaction.fields.getTextInputValue('rules_input');
            const rewards = interaction.fields.getTextInputValue('rewards_input');
            const footer = interaction.fields.getTextInputValue('footer_input');

            const embed = new EmbedBuilder()
                .setColor('#ff0000')
                .setTitle(title)
                .setDescription('> Configure seu CxC usando os campos abaixo:')
                .addFields(
                    {
                        name: '📋 Requisitos',
                        value: requirements,
                        inline: false
                    },
                    {
                        name: '📜 Regras',
                        value: rules,
                        inline: false
                    },
                    {
                        name: '🏆 Recompensas',
                        value: rewards,
                        inline: false
                    }
                )
                .setFooter({ 
                    text: footer,
                    iconURL: interaction.guild.iconURL({ dynamic: true })
                })
                .setTimestamp();

            const acceptButton = new ButtonBuilder()
                .setCustomId('accept_cxc')
                .setLabel('✅ Aceitar')
                .setStyle(ButtonStyle.Success);

            const declineButton = new ButtonBuilder()
                .setCustomId('decline_cxc')
                .setLabel('❌ Recusar')
                .setStyle(ButtonStyle.Danger);

            const row = new ActionRowBuilder()
                .addComponents(acceptButton, declineButton);

            const channel = interaction.channel;
            const messages = await channel.messages.fetch({ limit: 1 });
            const lastMessage = messages.first();

            if (lastMessage && lastMessage.author.id === interaction.client.user.id) {
                await lastMessage.edit({ embeds: [embed], components: [row] });
                this.saveLastMessage(interaction.guildId, lastMessage.id, { 
                    type: 'cxc_panel',
                });
                await interaction.editReply({ content: '✅ Painel CxC atualizado com sucesso!', ephemeral: true });
            } else {
                const newMessage = await channel.send({ embeds: [embed], components: [row] });
                this.saveLastMessage(interaction.guildId, newMessage.id, { 
                    type: 'cxc_panel',
                });
                await interaction.editReply({ content: '✅ Painel CxC criado com sucesso!', ephemeral: true });
            }
        } catch (error) {
            console.error('Erro ao editar painel CxC:', error);
            await interaction.editReply({ 
                content: '❌ Ocorreu um erro ao editar o painel CxC.', 
                ephemeral: true 
            });
        }
    }

    addTicket(guildId, userId, channelId) {
        if (!this.tickets[guildId]) {
            this.tickets[guildId] = {};
        }
        this.tickets[guildId][userId] = channelId;
        this.saveTickets();
    }

    removeTicket(guildId, userId) {
        if (this.tickets[guildId] && this.tickets[guildId][userId]) {
            delete this.tickets[guildId][userId];
            this.saveTickets();
        }
    }

    convertFKDR(fkdr) {
        if (fkdr >= 100) {
            return Number((fkdr / 100).toFixed(2));
        }
        return Number(fkdr.toFixed(2));
    }

    formatFKDR(fkdr) {
        const convertedFKDR = this.convertFKDR(fkdr);
        return convertedFKDR.toFixed(2);
    }

    isDiscordLinked(playerData, discordId) {
        if (!playerData.discord?.id) return false;
        return playerData.discord.id === discordId;
    }

    async fetchPlayerStats(username) {
        const response = await axios.get(`https://mush.com.br/api/player/${username}`);
        return response.data.response.stats.bedwars;
    }

    checkRequirements(stats, config) {
        const playerFKDR = this.convertFKDR(stats.fkdr);
        return playerFKDR >= config.minFKDR && stats.level >= config.minLevel;
    }

    async createRecruitmentTicket(interaction, username, stats, playerData, isAranked = false) {
        try {
            const categoryType = isAranked ? 'aranked' : 'recruitment';
            const category = await this.getTicketCategory(interaction.guild, categoryType);

            const config = this.getServerConfig(interaction.guild.id);
            const ticketViewerRoles = config.ticketViewerRoles || [];

            const permissionOverwrites = [
                {
                    id: interaction.guild.id,
                    deny: ['ViewChannel']
                },
                {
                    id: interaction.user.id,
                    allow: ['ViewChannel', 'SendMessages', 'ReadMessageHistory']
                },
                {
                    id: interaction.client.user.id,
                    allow: ['ViewChannel', 'SendMessages', 'ManageChannels', 'ReadMessageHistory']
                }
            ];

            // Add roles that can view the tickets
            for (const roleId of ticketViewerRoles) {
                permissionOverwrites.push({
                    id: roleId,
                    allow: ['ViewChannel', 'SendMessages', 'ReadMessageHistory']
                });
            }

            const ticketChannel = await interaction.guild.channels.create({
                name: `${isAranked ? 'aranked' : 'recrutamento'}-${username.toLowerCase()}`,
                type: ChannelType.GuildText,
                parent: category,
                permissionOverwrites
            });

            // Resto do código existente para criar embeds...
            const savedContent = await this.getPanelContent(interaction.guild.id) || {};
            
            const welcomeEmbed = new EmbedBuilder()
                .setColor('#2f3136')
                .setDescription(
                    savedContent.welcomeMessage || '『 ✨ Bem-vindo ao seu ticket de recrutamento! 』\n\n' +
                    '> Por favor, responda as seguintes perguntas:\n\n' +
                    '```md\n' +
                    (savedContent.questions || 
                    '1. Por que você quer entrar no nosso Clan?\n' +
                    '2. Quantas horas por dia você pode jogar?\n' +
                    '3. Quais jogos você tem experiência?\n' +
                    '4. Qual sua idade?\n') +
                    '```\n' +
                    '> Um membro da equipe irá analisar seu pedido de recrutamento em breve.'
                );

            const guildLogo = this.client.guildSettingsManager.getGuildLogo(interaction.guildId);
            
            const statsEmbed = new EmbedBuilder()
                .setTitle(`📋 Candidatura ${isAranked ? 'ARANKED' : ''} de ${username}`)
                .setColor(isAranked ? '#ff9900' : '#00ff00')
                .setThumbnail(guildLogo) // Use a logo personalizada aqui
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

            await ticketChannel.send({
                content: `<@${interaction.user.id}>`,
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

    async handleCloseTicket(interaction) {
        if (!interaction.member.permissions.has('ManageChannels')) {
            return await interaction.reply({
                content: '❌ Apenas staff pode fechar tickets!',
                flags: 64
            });
        }

        const savedContent = await this.getPanelContent(interaction.guild.id) || {};
        
        await interaction.deferReply({ flags: 64 });
        
        try {
            await interaction.editReply({
                content: savedContent.closeMessage || '🔒 Fechando ticket em 5 segundos...',
                flags: 64
            });

            // Find the ticket owner
            const ticketOwner = Object.entries(this.tickets[interaction.guild.id] || {})
                .find(([userId, channelId]) => channelId === interaction.channel.id);

            if (ticketOwner) {
                const [userId] = ticketOwner;
                this.removeTicket(interaction.guild.id, userId);
            }

            setTimeout(async () => {
                try {
                    await interaction.channel.delete();
                } catch (error) {
                    console.error('Erro ao deletar canal:', error);
                    await interaction.editReply({
                        content: '❌ Erro ao fechar o ticket.',
                        flags: 64
                    }).catch(() => {});
                }
            }, 5000);
        } catch (error) {
            console.error('Erro ao fechar ticket:', error);
        }
    }

    async getTicketCategory(guild, type = 'recruitment') {
        const categoryNames = {
            'recruitment': 'RECRUTAMENTO',
            'aranked': 'ARANKED',
            'cxc': 'CLAN X CLAN',
            'partnership': 'PARCERIAS'
        };

        const categoryName = categoryNames[type] || 'TICKETS';
        let category = guild.channels.cache.find(c => 
            c.name === categoryName && 
            c.type === ChannelType.GuildCategory
        );
        
        if (!category) {
            category = await guild.channels.create({
                name: categoryName,
                type: ChannelType.GuildCategory,
                permissionOverwrites: [
                    {
                        id: guild.id,
                        deny: ['ViewChannel']
                    },
                    {
                        id: guild.client.user.id,
                        allow: ['ViewChannel', 'SendMessages', 'ManageChannels']
                    }
                ]
            });
        }
        return category;
    }

    async processCxCLineup(line) {
        const lineStats = [];
        const promises = line.map(async (playerName) => {
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
                console.error(`Erro ao buscar jogador ${playerName}:`, error);
                return null;
            }
        });

        const results = await Promise.all(promises);
        return results.filter(result => result !== null);
    }

    async handleRecruitmentApplication(interaction) {
        await interaction.reply({
            content: 'Iniciando processo de recrutamento...',
            flags: 64
        });
        // Adicione aqui a lógica para processar a aplicação
    }

    async handleARankedApplication(interaction) {
        await interaction.reply({
            content: 'Iniciando processo de aplicação ranked...',
            flags: 64
        });
        // Adicione aqui a lógica para processar a aplicação ranked
    }

    // Novo método para salvar a última mensagem do painel por servidor
    savePanelMessage(guildId, messageId) {
        this.panelMessages[guildId] = messageId;
        // Salvar no arquivo de configuração do servidor
        const config = this.loadConfig(guildId);
        config.lastPanelMessageId = messageId;
        this.saveConfig(guildId, config);
    }

    // Novo método para obter a última mensagem do painel
    getPanelMessage(guildId) {
        const config = this.loadConfig(guildId);
        return config.lastPanelMessageId;
    }

    getServerPanelContent(guildId) {
        if (!this.messages[guildId]) return null;
        return this.messages[guildId].lastMessage?.content;
    }

    saveServerPanelContent(guildId, content) {
        if (!this.messages[guildId]) {
            this.messages[guildId] = {};
        }
        if (!this.messages[guildId].lastMessage) {
            this.messages[guildId].lastMessage = {};
        }
        this.messages[guildId].lastMessage.content = content;
        this.saveMessages();
    }

    // Novo método para carregar mensagens dos painéis
    loadPanelMessages() {
        const panelMessagesPath = path.join(this.configDir, 'panel-messages.json');
        try {
            if (fs.existsSync(panelMessagesPath)) {
                this.panelMessages = JSON.parse(fs.readFileSync(panelMessagesPath, 'utf8'));
            }
        } catch (error) {
            console.error('Error loading panel messages:', error);
        }
    }

    // Novo método para salvar mensagens dos painéis
    savePanelMessages() {
        const panelMessagesPath = path.join(this.configDir, 'panel-messages.json');
        try {
            fs.writeFileSync(panelMessagesPath, JSON.stringify(this.panelMessages, null, 2));
        } catch (error) {
            console.error('Error saving panel messages:', error);
        }
    }

    // Atualizado para carregar valores salvos no modal
    async execute(interaction) {
        const savedContent = this.panelMessages[interaction.guildId] || {};

        const modal = new ModalBuilder()
            .setCustomId('paineledit_modal')
            .setTitle('Editor do Painel Administrativo');

        const rulesInput = new TextInputBuilder()
            .setCustomId('rules_input')
            .setLabel('Regras da ARANKED')
            .setStyle(TextInputStyle.Paragraph)
            .setPlaceholder('Digite as regras da ARANKED...')
            .setValue(savedContent.rules || '<:Egg_bridger:1325512065183514745> | Ovo construtor antes do BedBreak\n<:Fireball:1325512104865828968> | Bola de fogo')
            .setRequired(true);

        const additionalRulesInput = new TextInputBuilder()
            .setCustomId('additional_rules_input')
            .setLabel('Regras Adicionais')
            .setStyle(TextInputStyle.Paragraph)
            .setPlaceholder('Digite as regras adicionais...')
            .setValue(savedContent.additionalRules || '❗ É totalmente proibido o uso do comando `/nick` durante partidas.')
            .setRequired(true);

        const optionsInput = new TextInputBuilder()
            .setCustomId('options_input')
            .setLabel('Opções Disponíveis')
            .setStyle(TextInputStyle.Paragraph)
            .setPlaceholder('Digite as opções disponíveis...')
            .setValue(savedContent.options || '<:diamond_sword:1325512395027648553> **Clan x Clan**\n➥ Crie um ticket para organizar CxC')
            .setRequired(true);

        modal.addComponents(
            new ActionRowBuilder().addComponents(rulesInput),
            new ActionRowBuilder().addComponents(additionalRulesInput),
            new ActionRowBuilder().addComponents(optionsInput)
        );

        await interaction.showModal(modal);
    }

    // Add this new method
    async handleCommand(interaction) {
        try {
            const savedContent = await this.getPanelContent(interaction.guildId);
            
            const modal = new ModalBuilder()
                .setCustomId('paineledit_modal')
                .setTitle('Editor do Painel Administrativo');

            const rulesInput = new TextInputBuilder()
                .setCustomId('rules_input')
                .setLabel('Regras da ARANKED')
                .setStyle(TextInputStyle.Paragraph)
                .setPlaceholder('Digite as regras da ARANKED...')
                .setValue(savedContent?.rules || '<:Egg_bridger:1325512065183514745> | Ovo construtor antes do BedBreak')
                .setRequired(true);

            const additionalRulesInput = new TextInputBuilder()
                .setCustomId('additional_rules_input')
                .setLabel('Regras Adicionais')
                .setStyle(TextInputStyle.Paragraph)
                .setPlaceholder('Digite as regras adicionais...')
                .setValue(savedContent?.additionalRules || '❗ É totalmente proibido o uso do comando `/nick` durante partidas.')
                .setRequired(true);

            const optionsInput = new TextInputBuilder()
                .setCustomId('options_input')
                .setLabel('Opções Disponíveis')
                .setStyle(TextInputStyle.Paragraph)
                .setPlaceholder('Digite as opções disponíveis...')
                .setValue(savedContent?.options || '<:diamond_sword:1325512395027648553> **Clan x Clan**\n➥ Crie um ticket para organizar CxC')
                .setRequired(true);

            modal.addComponents(
                new ActionRowBuilder().addComponents(rulesInput),
                new ActionRowBuilder().addComponents(additionalRulesInput),
                new ActionRowBuilder().addComponents(optionsInput)
            );

            await interaction.showModal(modal);
        } catch (error) {
            console.error('Erro ao mostrar modal:', error);
            if (!interaction.replied) {
                await interaction.reply({ 
                    content: '❌ Erro ao abrir o editor.', 
                    flags: 64 
                });
            }
        }
    }

    async getPanelContent(guildId) {
        try {
            const inMemoryContent = this.messages[guildId]?.lastMessage?.content;
            if (inMemoryContent) return inMemoryContent;

            if (fs.existsSync(this.panelMessagesFile)) {
                const data = JSON.parse(fs.readFileSync(this.panelMessagesFile, 'utf8'));
                if (data[guildId]) {
                    if (!this.messages[guildId]) this.messages[guildId] = {};
                    this.messages[guildId].lastMessage = { content: data[guildId] };
                    return data[guildId];
                }
            }

            const serverConfig = this.getServerConfig(guildId);
            if (serverConfig.panelContent) {
                return serverConfig.panelContent;
            }
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

    async handlePanelEditModal(interaction) {
        try {
            await interaction.deferReply({ ephemeral: true });
            
            const rules = interaction.fields.getTextInputValue('rules_input');
            const additionalRules = interaction.fields.getTextInputValue('additional_rules_input');
            const options = interaction.fields.getTextInputValue('options_input');

            const content = { rules, additionalRules, options };
            await this.savePanelContent(interaction.guildId, content);

            let targetChannel = interaction.channel;
            const lastEditedChannelId = this.getLastEditedChannel(interaction.guildId);
            if (lastEditedChannelId) {
                targetChannel = await interaction.guild.channels.fetch(lastEditedChannelId)
                    .catch(() => interaction.channel);
            }

            const messages = await targetChannel.messages.fetch({ limit: 50 });
            const targetMessage = messages.find(msg => 
                msg.author.id === interaction.client.user.id && 
                msg.embeds.length > 0 &&
                (msg.embeds[0].title.includes('SISTEMA DE TICKET') || 
                 msg.embeds[0].title.includes('PAINEL DE ADMINISTRAÇÃO'))
            );

            if (!targetMessage) {
                return await interaction.editReply({
                    content: '❌ Não encontrei nenhum painel para editar neste canal.',
                    ephemeral: true
                });
            }

            const newEmbed = targetMessage.embeds[0].toJSON();
            newEmbed.fields = [
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
            ];

            await targetMessage.edit({ embeds: [newEmbed] });

            const contentToSave = {
                rules,
                additionalRules,
                options,
                type: 'admin_panel'
            };
            
            this.saveServerPanelContent(interaction.guildId, contentToSave);
            this.saveLastMessage(interaction.guildId, targetMessage.id, contentToSave);

            await interaction.editReply({
                content: '✅ Painel atualizado com sucesso!',
                ephemeral: true
            });

        } catch (error) {
            console.error('Erro ao editar painel:', error);
            await interaction.editReply({
                content: '❌ Ocorreu um erro ao editar o painel.',
                ephemeral: true
            }).catch(console.error);
        }
    }

    // Add these new methods to the class
    async handlePainelEditModal(interaction) {
        try {
            await interaction.deferReply({ ephemeral: true });
            
            const welcomeMessage = interaction.fields.getTextInputValue('welcome_message');
            const questions = interaction.fields.getTextInputValue('questions');
            const closeMessage = interaction.fields.getTextInputValue('close_message');

            // Save the modal messages content
            const content = {
                welcomeMessage,
                questions,
                closeMessage,
                lastUpdate: Date.now()
            };

            await this.savePanelContent(interaction.guildId, content);
            
            await interaction.editReply({
                content: '✅ Mensagens dos modais atualizadas com sucesso!',
                ephemeral: true
            });

        } catch (error) {
            console.error('Erro ao salvar mensagens dos modais:', error);
            if (interaction.deferred) {
                await interaction.editReply({
                    content: '❌ Erro ao salvar as mensagens. Tente novamente.',
                    ephemeral: true
                });
            }
        }
    }

    // Update these methods to handle modal content
    async createRecruitmentTicket(interaction, username, stats, playerData, isAranked = false) {
        try {
            const categoryType = isAranked ? 'aranked' : 'recruitment';
            const category = await this.getTicketCategory(interaction.guild, categoryType);
            
            const config = this.getServerConfig(interaction.guild.id);
            const ticketViewerRoles = config.ticketViewerRoles || [];

            const permissionOverwrites = [
                {
                    id: interaction.guild.id,
                    deny: ['ViewChannel']
                },
                {
                    id: interaction.user.id,
                    allow: ['ViewChannel', 'SendMessages', 'ReadMessageHistory']
                },
                {
                    id: interaction.client.user.id,
                    allow: ['ViewChannel', 'SendMessages', 'ManageChannels', 'ReadMessageHistory']
                }
            ];

            // Add roles that can view the tickets
            for (const roleId of ticketViewerRoles) {
                permissionOverwrites.push({
                    id: roleId,
                    allow: ['ViewChannel', 'SendMessages', 'ReadMessageHistory']
                });
            }

            const ticketChannel = await interaction.guild.channels.create({
                name: `${isAranked ? 'aranked' : 'recrutamento'}-${username.toLowerCase()}`,
                type: ChannelType.GuildText,
                parent: category,
                permissionOverwrites
            });

            // Resto do código existente para criar embeds...
            const savedContent = await this.getPanelContent(interaction.guild.id) || {};
            
            const welcomeEmbed = new EmbedBuilder()
                .setColor('#2f3136')
                .setDescription(
                    savedContent.welcomeMessage || '『 ✨ Bem-vindo ao seu ticket de recrutamento! 』\n\n' +
                    '> Por favor, responda as seguintes perguntas:\n\n' +
                    '```md\n' +
                    (savedContent.questions || 
                    '1. Por que você quer entrar no nosso Clan?\n' +
                    '2. Quantas horas por dia você pode jogar?\n' +
                    '3. Quais jogos você tem experiência?\n' +
                    '4. Qual sua idade?\n') +
                    '```\n' +
                    '> Um membro da equipe irá analisar seu pedido de recrutamento em breve.'
                );

            const guildLogo = this.client.guildSettingsManager.getGuildLogo(interaction.guildId);
            
            const statsEmbed = new EmbedBuilder()
                .setTitle(`📋 Candidatura ${isAranked ? 'ARANKED' : ''} de ${username}`)
                .setColor(isAranked ? '#ff9900' : '#00ff00')
                .setThumbnail(guildLogo) // Use a logo personalizada aqui
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

            await ticketChannel.send({
                content: `<@${interaction.user.id}>`,
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

    async handleCloseTicket(interaction) {
        if (!interaction.member.permissions.has('ManageChannels')) {
            return await interaction.reply({
                content: '❌ Apenas staff pode fechar tickets!',
                flags: 64
            });
        }

        const savedContent = await this.getPanelContent(interaction.guild.id) || {};
        
        await interaction.deferReply({ flags: 64 });
        
        try {
            await interaction.editReply({
                content: savedContent.closeMessage || '🔒 Fechando ticket em 5 segundos...',
                flags: 64
            });

            // Find the ticket owner
            const ticketOwner = Object.entries(this.tickets[interaction.guild.id] || {})
                .find(([userId, channelId]) => channelId === interaction.channel.id);

            if (ticketOwner) {
                const [userId] = ticketOwner;
                this.removeTicket(interaction.guild.id, userId);
            }

            setTimeout(async () => {
                try {
                    await interaction.channel.delete();
                } catch (error) {
                    console.error('Erro ao deletar canal:', error);
                    await interaction.editReply({
                        content: '❌ Erro ao fechar o ticket.',
                        flags: 64
                    }).catch(() => {});
                }
            }, 5000);
        } catch (error) {
            console.error('Erro ao fechar ticket:', error);
        }
    }

    async handleButton(interaction) {
        if (!interaction.isButton()) return;

        try {
            switch (interaction.customId) {
                case 'cxc': {
                    const modal = new ModalBuilder()
                        .setCustomId('cxc-modal')
                        .setTitle('Clan x Clan');

                    const rulesInput = new TextInputBuilder()
                        .setCustomId('rules')
                        .setLabel('Regras (ex: MD5, Aranked)')
                        .setStyle(TextInputStyle.Short)
                        .setRequired(true)
                        .setMaxLength(100);

                    const nickInput = new TextInputBuilder()
                        .setCustomId('nick')
                        .setLabel('Nick do Jogador')
                        .setStyle(TextInputStyle.Short)
                        .setRequired(true)
                        .setMaxLength(16);

                    const clanInput = new TextInputBuilder()
                        .setCustomId('clan')
                        .setLabel('Nome do Clan')
                        .setStyle(TextInputStyle.Short)
                        .setRequired(true)
                        .setMaxLength(32);

                    const lineInput = new TextInputBuilder()
                        .setCustomId('line')
                        .setLabel('Line-up (max 4, separar por virgula)')
                        .setStyle(TextInputStyle.Paragraph)
                        .setRequired(true)
                        .setMaxLength(100);

                    modal.addComponents(
                        new ActionRowBuilder().addComponents(rulesInput),
                        new ActionRowBuilder().addComponents(nickInput),
                        new ActionRowBuilder().addComponents(clanInput),
                        new ActionRowBuilder().addComponents(lineInput)
                    );

                    await interaction.showModal(modal);
                    break;
                }
                case 'parceria': {
                    const modal = new ModalBuilder()
                        .setCustomId('parceria_modal') // Changed hyphen to underscore
                        .setTitle('Parceria');

                    const nickInput = new TextInputBuilder()
                        .setCustomId('nick')
                        .setLabel('Nick do Jogador')
                        .setStyle(TextInputStyle.Short)
                        .setRequired(true);

                    const discordLinkInput = new TextInputBuilder()
                        .setCustomId('discord_link')
                        .setLabel('Link do Discord')
                        .setStyle(TextInputStyle.Short)
                        .setRequired(true);

                    modal.addComponents(
                        new ActionRowBuilder().addComponents(nickInput),
                        new ActionRowBuilder().addComponents(discordLinkInput)
                    );

                    await interaction.showModal(modal);
                    break;
                }
                case 'apply_recruitment':
                    await this.handleRecruitmentButton(interaction);
                    break;
                case 'apply_aranked':
                    await this.handleArankedRecruitment(interaction);
                    break;
                case 'close_ticket':
                    await this.handleCloseTicket(interaction);
                    break;
                default:
                    if (!interaction.replied) {
                        await interaction.reply({
                            content: '❌ Botão não reconhecido.',
                            ephemeral: true
                        });
                    }
                    break;
            }
        } catch (error) {
            console.error('Error handling button:', error);
            if (!interaction.replied && !interaction.deferred) {
                await interaction.reply({
                    content: '❌ Ocorreu um erro ao processar sua solicitação.',
                    ephemeral: true
                });
            }
        }
    }

    async handleParceriaButton(interaction) {
        try {
            const modal = new ModalBuilder()
                .setCustomId('parceria-modal')
                .setTitle('Parceria');

            const nickInput = new TextInputBuilder()
                .setCustomId('nick')
                .setLabel('Nick do Jogador')
                .setStyle(TextInputStyle.Short)
                .setRequired(true);

            const discordLinkInput = new TextInputBuilder()
                .setCustomId('discord_link')
                .setLabel('Link do Discord')
                .setStyle(TextInputStyle.Short)
                .setRequired(true);

            modal.addComponents(
                new ActionRowBuilder().addComponents(nickInput),
                new ActionRowBuilder().addComponents(discordLinkInput)
            );

            await interaction.showModal(modal);
        } catch (error) {
            console.error('Error showing partnership modal:', error);
            if (!interaction.replied && !interaction.deferred) {
                await interaction.reply({
                    content: '❌ Erro ao abrir o modal de parceria.',
                    ephemeral: true
                });
            }
        }
    }

    setLastEditedChannel(guildId, channelId) {
        if (!this.messages[guildId]) {
            this.messages[guildId] = {};
        }
        this.messages[guildId].lastEditedChannel = channelId;
        this.saveMessages();
    }

    getLastEditedChannel(guildId) {
        return this.messages[guildId]?.lastEditedChannel;
    }

    async handlePanelEditModal(interaction) {
        try {
            await interaction.deferReply({ ephemeral: true });
            
            const rules = interaction.fields.getTextInputValue('rules_input');
            const additionalRules = interaction.fields.getTextInputValue('additional_rules_input');
            const options = interaction.fields.getTextInputValue('options_input');

            // Procurar o canal correto
            let targetChannel = interaction.channel;
            const lastEditedChannelId = this.getLastEditedChannel(interaction.guildId);
            if (lastEditedChannelId) {
                targetChannel = await interaction.guild.channels.fetch(lastEditedChannelId)
                    .catch(() => interaction.channel);
            }

            // Procurar a última mensagem do bot no canal
            const messages = await targetChannel.messages.fetch({ limit: 50 });
            const targetMessage = messages.find(msg => 
                msg.author.id === interaction.client.user.id && 
                msg.embeds.length > 0 &&
                (msg.embeds[0].title.includes('SISTEMA DE TICKET') || 
                 msg.embeds[0].title.includes('PAINEL DE ADMINISTRAÇÃO'))
            );

            if (!targetMessage) {
                return await interaction.editReply({
                    content: '❌ Não encontrei nenhum painel para editar neste canal.',
                    ephemeral: true
                });
            }

            // Atualizar o embed
            const newEmbed = targetMessage.embeds[0].toJSON();
            newEmbed.fields = [
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
            ];

            await targetMessage.edit({ embeds: [newEmbed] });

            // Salvar o conteúdo atualizado
            const contentToSave = {
                rules,
                additionalRules,
                options,
                type: 'admin_panel'
            };
            
            this.saveServerPanelContent(interaction.guildId, contentToSave);
            this.saveLastMessage(interaction.guildId, targetMessage.id, contentToSave);

            await interaction.editReply({
                content: '✅ Painel atualizado com sucesso!',
                ephemeral: true
            });

        } catch (error) {
            console.error('Erro ao editar painel:', error);
            await interaction.editReply({
                content: '❌ Ocorreu um erro ao editar o painel.',
                ephemeral: true
            }).catch(console.error);
        }
    }

    loadServerConfigs() {
        try {
            if (fs.existsSync(this.configsFile)) {
                this.serverConfigs = JSON.parse(fs.readFileSync(this.configsFile, 'utf8'));
            } else {
                this.serverConfigs = {};
                this.saveServerConfigs();
            }
        } catch (error) {
            console.error('Error loading server configs:', error);
            this.serverConfigs = {};
        }
    }

    // Adicionar método para salvar configurações
    saveServerConfigs() {
        try {
            fs.writeFileSync(this.configsFile, JSON.stringify(this.serverConfigs, null, 2));
        } catch (error) {
            console.error('Error saving server configs:', error);
        }
    }

    // Adicionar método para obter configuração de servidor específico
    getServerConfig(guildId) {
        if (!this.serverConfigs[guildId]) {
            this.serverConfigs[guildId] = {
                lastPanelMessageId: null,
                lastEditedChannelId: null,
                customMessages: {
                    welcome: null,
                    questions: null,
                    close: null
                }
            };
            this.saveServerConfigs();
        }
        return this.serverConfigs[guildId];
    }

    // Adicionar método para atualizar configuração de servidor
    updateServerConfig(guildId, config) {
        this.serverConfigs[guildId] = {
            ...this.getServerConfig(guildId),
            ...config
        };
        this.saveServerConfigs();
    }

    // ...existing code...

    async updateTicketPermissions(channel, guildId) {
        try {
            const config = this.getServerConfig(guildId);
            const ticketViewerRoles = config.ticketViewerRoles || [];

            // Se for uma categoria
            if (channel.type === ChannelType.GuildCategory) {
                // Atualizar a própria categoria
                const categoryPermissions = [
                    {
                        id: channel.guild.id,
                        deny: ['ViewChannel']
                    },
                    {
                        id: this.client.user.id,
                        allow: ['ViewChannel', 'SendMessages', 'ManageChannels', 'ReadMessageHistory']
                    },
                    ...ticketViewerRoles.map(roleId => ({
                        id: roleId,
                        allow: ['ViewChannel', 'SendMessages', 'ReadMessageHistory']
                    }))
                ];
                
                await channel.permissionOverwrites.set(categoryPermissions);

                // Atualizar todos os canais na categoria
                const children = channel.children.cache;
                for (const childChannel of children.values()) {
                    await this.updateTicketPermissions(childChannel, guildId);
                }
                return true;
            }

            // Para canais individuais
            const permissions = [
                {
                    id: channel.guild.id,
                    deny: ['ViewChannel']
                },
                {
                    id: this.client.user.id,
                    allow: ['ViewChannel', 'SendMessages', 'ManageChannels', 'ReadMessageHistory']
                }
            ];

            // Adicionar permissões dos cargos
            for (const roleId of ticketViewerRoles) {
                try {
                    const role = await channel.guild.roles.fetch(roleId);
                    if (role) {
                        permissions.push({
                            id: roleId,
                            allow: ['ViewChannel', 'SendMessages', 'ReadMessageHistory']
                        });
                    }
                } catch (error) {
                    console.error(`Error fetching role ${roleId}:`, error);
                }
            }

            // Adicionar o criador do ticket se existir
            const ticketCreator = Object.entries(this.tickets[guildId] || {})
                .find(([userId, channelId]) => channelId === channel.id);
            
            if (ticketCreator) {
                permissions.push({
                    id: ticketCreator[0],
                    allow: ['ViewChannel', 'SendMessages', 'ReadMessageHistory']
                });
            }

            await channel.permissionOverwrites.set(permissions);
            return true;
        } catch (error) {
            console.error('Error updating ticket permissions:', error);
            return false;
        }
    }

    async updateAllTickets(guildId) {
        try {
            const guild = await this.client.guilds.fetch(guildId);
            
            // Primeiro atualiza todas as categorias
            const categories = guild.channels.cache.filter(channel => 
                channel.type === ChannelType.GuildCategory &&
                ['RECRUTAMENTO', 'ARANKED', 'CLAN X CLAN', 'PARCERIAS', 'TICKETS']
                    .includes(channel.name?.toUpperCase())
            );

            for (const category of categories.values()) {
                await this.updateTicketPermissions(category, guildId);
            }

            // Depois atualiza tickets individuais que possam estar fora das categorias
            const guildTickets = this.tickets[guildId] || {};
            for (const channelId of Object.values(guildTickets)) {
                try {
                    const channel = await guild.channels.fetch(channelId);
                    if (channel && channel.type !== ChannelType.GuildCategory) {
                        await this.updateTicketPermissions(channel, guildId);
                    }
                } catch (error) {
                    console.error(`Error updating ticket ${channelId}:`, error);
                }
            }

            return true;
        } catch (error) {
            console.error('Error updating all tickets:', error);
            return false;
        }
    }

    // ...rest of existing code...

    async handleCxCModal(interaction) {
        try {
            await interaction.deferReply({ flags: 64 });
            const rules = interaction.fields.getTextInputValue('rules');
            const nick = interaction.fields.getTextInputValue('nick');
            const clan = interaction.fields.getTextInputValue('clan');
            const line = interaction.fields.getTextInputValue('line').split(',').map(p => p.trim());

            // Create CxC category if it doesn't exist
            const category = await this.getTicketCategory(interaction.guild, 'cxc');
            
            // Create ticket channel
            const ticketChannel = await interaction.guild.channels.create({
                name: `cxc-${nick.toLowerCase()}`,
                type: ChannelType.GuildText,
                parent: category,
                permissionOverwrites: [
                    {
                        id: interaction.guild.id,
                        deny: ['ViewChannel']
                    },
                    {
                        id: interaction.user.id,
                        allow: ['ViewChannel', 'SendMessages', 'ReadMessageHistory']
                    },
                    {
                        id: interaction.client.user.id,
                        allow: ['ViewChannel', 'SendMessages', 'ManageChannels', 'ReadMessageHistory']
                    }
                ]
            });

            // Add ticket viewer roles
            const config = this.getServerConfig(interaction.guildId);
            const ticketViewerRoles = config.ticketViewerRoles || [];
            for (const roleId of ticketViewerRoles) {
                await ticketChannel.permissionOverwrites.create(roleId, {
                    ViewChannel: true,
                    SendMessages: true,
                    ReadMessageHistory: true
                });
            }

            // Fetch player stats for the line-up
            const lineStats = await this.processCxCLineup(line);

            // Create CxC embed
            const embed = new EmbedBuilder()
                .setTitle(`🎮 Clan x Clan - ${clan}`)
                .setColor('#ff0000')
                .addFields([
                    {
                        name: '👑 Organizador',
                        value: `<@${interaction.user.id}> (${nick})`,
                        inline: true
                    },
                    {
                        name: '🏷️ Clan',
                        value: clan,
                        inline: true
                    },
                    {
                        name: '📋 Regras',
                        value: rules,
                        inline: false
                    },
                    {
                        name: '👥 Line-up',
                        value: lineStats.map(player => 
                            `• ${player.username} (${player.clan ? player.clan.name : 'Sem Clan'})\n` +
                            `  - Nível: ${player.bedwars.level}\n` +
                            `  - FKDR: ${player.bedwars.fkdr}\n` +
                            `  - Winstreak: ${player.bedwars.winstreak}\n`
                        ).join('\n'),
                        inline: false
                    }
                ])
                .setFooter({ 
                    text: interaction.guild.name,
                    iconURL: interaction.guild.iconURL({ dynamic: true })
                })
                .setTimestamp();

            const closeButton = new ButtonBuilder()
                .setCustomId('close_ticket')
                .setLabel('🔒 Fechar Ticket')
                .setStyle(ButtonStyle.Danger);

            const row = new ActionRowBuilder().addComponents(closeButton);

            await ticketChannel.send({
                content: `<@${interaction.user.id}>`,
                embeds: [embed],
                components: [row]
            });

            this.addTicket(interaction.guild.id, interaction.user.id, ticketChannel.id);

            await interaction.editReply({
                content: `✅ Ticket CxC criado com sucesso! Canal: <#${ticketChannel.id}>`,
                flags: 64
            });

        } catch (error) {
            console.error('Erro ao processar modal CxC:', error);
            if (interaction.deferred) {
                await interaction.editReply({
                    content: '❌ Erro ao criar ticket CxC.',
                    flags: 64
                });
            }
        }
    }
}

module.exports = RecruitmentManager;