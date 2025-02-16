const { 
    SlashCommandBuilder, 
    ModalBuilder, 
    TextInputBuilder, 
    TextInputStyle, 
    ActionRowBuilder,
    PermissionsBitField
} = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('paineledit')
        .setDescription('Edita o painel de administração')
        .setDefaultMemberPermissions(PermissionsBitField.Flags.Administrator)
        .addChannelOption(option =>
            option.setName('canal')
                .setDescription('Canal onde está o painel')
                .setRequired(true)),

    async execute(interaction) {
        try {
            // Verificar permissões
            if (!interaction.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
                return await interaction.reply({
                    content: '❌ Você precisa ser administrador para usar este comando.',
                    ephemeral: true
                });
            }

            const targetChannel = interaction.options.getChannel('canal');
            
            // Verificar se o canal existe e é um canal de texto
            if (!targetChannel || !targetChannel.isTextBased()) {
                return await interaction.reply({
                    content: '❌ Por favor, selecione um canal de texto válido.',
                    ephemeral: true
                });
            }

            // Criar o modal
            const modal = new ModalBuilder()
                .setCustomId(`paineledit_${interaction.guildId}_${targetChannel.id}`) // Identificador único
                .setTitle('Editor do Painel');

            // Título do Painel
            const titleInput = new TextInputBuilder()
                .setCustomId('title_input')
                .setLabel('Título do Painel')
                .setStyle(TextInputStyle.Short)
                .setValue('『 SISTEMA DE TICKET 』')
                .setPlaceholder('Digite o título do painel...')
                .setRequired(true);

            // Descrição do Painel
            const descriptionInput = new TextInputBuilder()
                .setCustomId('description_input')
                .setLabel('Descrição do Painel')
                .setStyle(TextInputStyle.Short)
                .setValue('Selecione uma das opções abaixo para criar um ticket.')
                .setPlaceholder('Digite a descrição do painel...')
                .setRequired(true);

            // Regras
            const rulesInput = new TextInputBuilder()
                .setCustomId('rules_input')
                .setLabel('Regras da ARANKED')
                .setStyle(TextInputStyle.Paragraph)
                .setPlaceholder('Digite as regras...')
                .setRequired(true);

            // Regras Adicionais
            const additionalRulesInput = new TextInputBuilder()
                .setCustomId('additional_rules_input')
                .setLabel('Regras Adicionais')
                .setStyle(TextInputStyle.Paragraph)
                .setPlaceholder('Digite as regras adicionais...')
                .setRequired(true);

            // Opções
            const optionsInput = new TextInputBuilder()
                .setCustomId('options_input')
                .setLabel('Opções Disponíveis')
                .setStyle(TextInputStyle.Paragraph)
                .setPlaceholder('Digite as opções...')
                .setRequired(true);

            modal.addComponents(
                new ActionRowBuilder().addComponents(titleInput),
                new ActionRowBuilder().addComponents(descriptionInput),
                new ActionRowBuilder().addComponents(rulesInput),
                new ActionRowBuilder().addComponents(additionalRulesInput),
                new ActionRowBuilder().addComponents(optionsInput)
            );

            // Armazenar o canal alvo temporariamente
            interaction.client.recruitmentManager.setLastEditedChannel(
                interaction.guildId,
                targetChannel.id
            );

            await interaction.showModal(modal);

        } catch (error) {
            console.error('Erro ao executar comando paineledit:', error);
            await interaction.reply({
                content: '❌ Ocorreu um erro ao abrir o editor.',
                ephemeral: true
            }).catch(console.error);
        }
    }
};
