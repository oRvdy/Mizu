const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('license')
        .setDescription('Gerenciar licenças premium')
        .addSubcommand(subcommand =>
            subcommand
                .setName('add')
                .setDescription('Adicionar uma licença')
                .addStringOption(option =>
                    option.setName('guild')
                        .setDescription('ID do servidor')
                        .setRequired(true))
                .addStringOption(option =>
                    option.setName('duration')
                        .setDescription('Duração (30d, 24h, 60m, 30s) - vazio = permanente')
                        .setRequired(false)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('remove')
                .setDescription('Remover uma licença')
                .addStringOption(option =>
                    option.setName('guild')
                        .setDescription('ID do servidor')
                        .setRequired(true)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('info')
                .setDescription('Ver informações da licença')
                .addStringOption(option =>
                    option.setName('guild')
                        .setDescription('ID do servidor')
                        .setRequired(false))),

    async execute(interaction) {
        try {
            const isAuthorized = await interaction.client.licenses.isAuthorized(interaction.user.id);
            if (!isAuthorized) {
                return await interaction.reply({
                    content: '❌ Você não tem permissão para usar este comando.',
                    flags: 64
                });
            }

            const subcommand = interaction.options.getSubcommand();
            const guildId = interaction.options.getString('guild');

            switch (subcommand) {
                case 'add': {
                    const duration = interaction.options.getString('duration');
                    const expiresAt = await interaction.client.licenses.addLicense(guildId, duration);
                    
                    const embed = new EmbedBuilder()
                        .setTitle('✅ Licença Adicionada')
                        .setColor('#00ff00')
                        .setDescription(`
                            > 🏷️ Servidor: \`${guildId}\`
                            > ⏱️ Tipo: ${duration ? 'Temporária' : 'Permanente'}
                            ${expiresAt ? `> 📅 Expira em: <t:${Math.floor(expiresAt.getTime()/1000)}:R>` : ''}
                        `);

                    await interaction.reply({ embeds: [embed], flags: 64 });
                    break;
                }

                case 'remove': {
                    await interaction.client.licenses.removeLicense(guildId);
                    await interaction.reply({
                        content: `✅ Licença removida do servidor \`${guildId}\``,
                        flags: 64
                    });
                    break;
                }

                case 'info': {
                    if (!guildId) {
                        await this.handleListAllLicenses(interaction);
                        return;
                    }

                    await this.handleSingleLicenseInfo(interaction, guildId);
                    break;
                }

                default:
                    await interaction.reply({
                        content: '❌ Subcomando inválido.',
                        flags: 64
                    });
            }
        } catch (error) {
            if (error.code === 40060 || error.code === 10062) return; // Ignore already acknowledged or unknown interaction
            console.error('Error in license command:', error);

            if (!interaction.replied && !interaction.deferred) {
                await interaction.reply({
                    content: '❌ Ocorreu um erro ao processar o comando.',
                    flags: 64
                });
            }
        }
    },

    async handleListAllLicenses(interaction) {
        const allLicenses = [];
                        
        for (const [serverId, license] of interaction.client.licenses.licenses) {
            try {
                let guildInfo;
                try {
                    guildInfo = await interaction.client.guilds.fetch(serverId);
                } catch (error) {
                    guildInfo = {
                        id: serverId,
                        name: 'Servidor Indisponível',
                        memberCount: '?',
                        iconURL: () => null
                    };
                }

                const isValid = await interaction.client.licenses.checkGuildLicense(serverId);
                
                allLicenses.push({
                    guild: guildInfo,
                    isValid,
                    license,
                    remainingTime: license.expiresAt ? interaction.client.licenses.getRemainingTime(license.expiresAt) : 'Permanente'
                });
            } catch (error) {
                console.error(`Erro ao processar servidor ${serverId}:`, error);
                allLicenses.push({
                    guild: {
                        id: serverId,
                        name: 'Erro ao carregar servidor',
                        memberCount: '?',
                        iconURL: () => null
                    },
                    isValid: await interaction.client.licenses.checkGuildLicense(serverId),
                    license,
                    remainingTime: license.expiresAt ? interaction.client.licenses.getRemainingTime(license.expiresAt) : 'Permanente'
                });
            }
        }

        if (allLicenses.length === 0) {
            return interaction.reply({
                content: '❌ Nenhuma licença encontrada.',
                flags: 64
            });
        }

        const embed = new EmbedBuilder()
            .setTitle('📋 Lista de Licenças Ativas')
            .setColor('#00ff00')
            .setDescription('Lista de todos os servidores com licença:')
            .addFields(
                allLicenses.map(({ guild, isValid, license, remainingTime }) => ({
                    name: `${isValid ? '🟢' : '🔴'} ${guild.name}`,
                    value: [
                        `> 🏷️ ID: \`${guild.id}\``,
                        `> 👥 Membros: \`${guild.memberCount}\``,
                        guild.id !== 'Servidor Indisponível' ? 
                            `> 🔗 [Link do Servidor](https://discord.com/channels/${guild.id})` : 
                            `> ⚠️ Servidor não acessível`,
                        `> ⏱️ Tipo: ${license.expiresAt ? 'Temporária' : 'Permanente'}`,
                        `> ⌛ Tempo: ${remainingTime}`,
                        `> 📅 Criada: <t:${Math.floor(license.createdAt.getTime()/1000)}:R>`
                    ].join('\n'),
                    inline: false
                }))
            )
            .setFooter({ 
                text: `Total de licenças: ${allLicenses.length}`,
                iconURL: interaction.guild?.iconURL({ dynamic: true }) || null
            })
            .setTimestamp();

        await interaction.reply({ embeds: [embed], flags: 64 });
    },

    async handleSingleLicenseInfo(interaction, guildId) {
        const info = await interaction.client.licenses.getLicenseStatus(guildId);
        if (!info) {
            return interaction.reply({
                content: `❌ Nenhuma licença encontrada para o servidor \`${guildId}\``,
                flags: 64
            });
        }

        try {
            const guild = await interaction.client.guilds.fetch(guildId);
            const embed = new EmbedBuilder()
                .setTitle('📋 Informações da Licença')
                .setColor(info.status === 'active' ? '#00ff00' : '#ff0000')
                .setThumbnail(guild.iconURL({ dynamic: true }))
                .setDescription(`
                    > 🏷️ Servidor: \`${guild.name}\`
                    > 📌 ID: \`${guildId}\`
                    > 👥 Membros: \`${guild.memberCount}\`
                    > 🔗 [Link do Servidor](https://discord.com/channels/${guildId})
                    > ✅ Status: ${info.status === 'active' ? 'Válida' : 'Inválida'}
                    > ⏱️ Tipo: ${info.type === 'lifetime' ? 'Permanente' : 'Temporária'}
                    > 📅 Criada em: <t:${Math.floor(info.createdAt.getTime()/1000)}:R>
                    ${info.type !== 'lifetime' ? `> ⌛ Tempo restante: ${info.daysLeft} dias` : ''}
                    ${info.expiresAt ? `> 📅 Expira em: <t:${Math.floor(info.expiresAt.getTime()/1000)}:R>` : ''}
                `);

            await interaction.reply({ embeds: [embed], flags: 64 });
        } catch (error) {
            console.error(`Erro ao buscar informações do servidor ${guildId}:`, error);
            await interaction.reply({
                content: `❌ Erro ao buscar informações do servidor \`${guildId}\``,
                flags: 64
            });
        }
    }
};
