const { SlashCommandBuilder, PermissionsBitField } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('configurar')
        .setDescription('Configura o sistema de tickets')
        .setDefaultMemberPermissions(PermissionsBitField.Flags.Administrator)
        .addSubcommand(subcommand =>
            subcommand
                .setName('adicionar_visualizador')
                .setDescription('Adiciona um cargo que pode visualizar tickets')
                .addRoleOption(option =>
                    option.setName('cargo')
                        .setDescription('Cargo para visualizar tickets')
                        .setRequired(true)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('remover_visualizador')
                .setDescription('Remove um cargo que pode visualizar tickets')
                .addRoleOption(option =>
                    option.setName('cargo')
                        .setDescription('Cargo a ser removido')
                        .setRequired(true)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('definir_notificacao')
                .setDescription('Define o cargo que será notificado ao criar tickets')
                .addRoleOption(option =>
                    option.setName('cargo')
                        .setDescription('Cargo a ser notificado')
                        .setRequired(true)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('adicionar_notificacao')
                .setDescription('Adiciona um cargo para ser notificado quando tickets forem criados')
                .addRoleOption(option =>
                    option.setName('cargo')
                        .setDescription('Cargo a ser notificado')
                        .setRequired(true)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('remover_notificacao')
                .setDescription('Remove um cargo das notificações de tickets')
                .addRoleOption(option =>
                    option.setName('cargo')
                        .setDescription('Cargo a ser removido')
                        .setRequired(true)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('definir_requisitos')
                .setDescription('Define os requisitos para recrutamento')
                .addNumberOption(option =>
                    option.setName('nivel')
                        .setDescription('Nível mínimo necessário')
                        .setRequired(true))
                .addNumberOption(option =>
                    option.setName('fkdr')
                        .setDescription('FKDR mínimo necessário')
                        .setRequired(true))),

    async execute(interaction) {
        const guildId = interaction.guild.id;
        const hasPremium = interaction.client.licenses.hasPremium(guildId);

        if (!hasPremium) {
            return await interaction.reply({
                content: '❌ Este comando é exclusivo para servidores com licença premium. Execute `/premium info` para mais informações.',
                ephemeral: true
            });
        }

        const subcommand = interaction.options.getSubcommand();
        const role = interaction.options.getRole('cargo');
        
        const config = interaction.client.recruitmentManager.getServerConfig(guildId);
        if (!config.ticketViewerRoles) config.ticketViewerRoles = [];
        if (!config.notifyRoles) config.notifyRoles = [];

        switch (subcommand) {
            case 'adicionar_visualizador':
                if (!config.ticketViewerRoles.includes(role.id)) {
                    config.ticketViewerRoles.push(role.id);
                    interaction.client.recruitmentManager.updateServerConfig(guildId, config);
                    return await interaction.reply({
                        content: `✅ O cargo ${role.name} foi adicionado aos visualizadores de tickets.`,
                        flags: 1 << 6
                    });
                }
                return await interaction.reply({
                    content: `⚠️ O cargo ${role.name} já é um visualizador de tickets.`,
                    flags: 1 << 6
                });

            case 'remover_visualizador':
                const index = config.ticketViewerRoles.indexOf(role.id);
                if (index > -1) {
                    config.ticketViewerRoles.splice(index, 1);
                    interaction.client.recruitmentManager.updateServerConfig(guildId, config);
                    return await interaction.reply({
                        content: `✅ O cargo ${role.name} foi removido dos visualizadores de tickets.`,
                        flags: 1 << 6
                    });
                }
                return await interaction.reply({
                    content: `⚠️ O cargo ${role.name} não é um visualizador de tickets.`,
                    flags: 1 << 6
                });

            case 'definir_notificacao':
                config.notifyRoleId = role.id;
                interaction.client.recruitmentManager.updateServerConfig(guildId, config);
                return await interaction.reply({
                    content: `✅ O cargo ${role.name} será notificado quando novos tickets forem criados.`,
                    flags: 1 << 6
                });

            case 'adicionar_notificacao':
                if (!config.notifyRoles.includes(role.id)) {
                    config.notifyRoles.push(role.id);
                    interaction.client.recruitmentManager.updateServerConfig(guildId, config);
                    return await interaction.reply({
                        content: `✅ O cargo ${role.name} será notificado quando novos tickets forem criados.`,
                        flags: 1 << 6
                    });
                }
                return await interaction.reply({
                    content: `⚠️ O cargo ${role.name} já está na lista de notificações.`,
                    flags: 1 << 6
                });

            case 'remover_notificacao':
                const notifyIndex = config.notifyRoles.indexOf(role.id);
                if (notifyIndex > -1) {
                    config.notifyRoles.splice(notifyIndex, 1);
                    interaction.client.recruitmentManager.updateServerConfig(guildId, config);
                    return await interaction.reply({
                        content: `✅ O cargo ${role.name} não será mais notificado de novos tickets.`,
                        flags: 1 << 6
                    });
                }
                return await interaction.reply({
                    content: `⚠️ O cargo ${role.name} não está na lista de notificações.`,
                    flags: 1 << 6
                });

            case 'definir_requisitos':
                const nivel = interaction.options.getNumber('nivel');
                const fkdr = interaction.options.getNumber('fkdr');
                config.minLevel = nivel;
                config.minFKDR = fkdr;
                interaction.client.recruitmentManager.updateServerConfig(guildId, config);
                return await interaction.reply({
                    content: `✅ Requisitos de recrutamento atualizados: Nível mínimo ${nivel}, FKDR mínimo ${fkdr}.`,
                    flags: 1 << 6
                });
        }
    }
};
