const { 
    SlashCommandBuilder, 
    EmbedBuilder, 
    ActionRowBuilder, 
    ButtonBuilder, 
    ButtonStyle, 
    ModalBuilder, 
    TextInputBuilder, 
    TextInputStyle, 
    PermissionsBitField,
    ChannelType 
} = require('discord.js');
const axios = require('axios');
const path = require('path');
const fs = require('fs');

function formatFKDR(fkdr) {
    const numericFKDR = Number(fkdr);
    return (numericFKDR / 100).toFixed(2);
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName('admincxc')
        .setDescription('[Admin] Administre Clan x Clan e Parcerias.')
        .setDefaultMemberPermissions(PermissionsBitField.Flags.Administrator),
        
    async execute(interaction) {
        try {
            await interaction.deferReply();

            const configPath = path.join(__dirname, '..', 'data', 'painel-config.json');
            let regras = '<:Egg_bridger:1325512065183514745> | Ovo construtor antes do BedBreak\n' +
                        '<:Fireball:1325512104865828968> | Bola de fogo\n' +
                        '<:Stick:1325512165582569533> | Graveto com Repulsão antes do BedBreak\n' +
                        '<:tnt:1325512192824443054> | Dinamite (TNT) antes do BedBreak\n' +
                        '<:Vidro:1325512214685155399> | Vidro\n' +
                        '<:Arco:1325512264949698641> | Arcos\n' +
                        '<:Bau:1325512290887401582> | Torre compacta\n' +
                        '<:Enderpearl:1325512314459521025> | Pérola do Fim\n' +
                        '<:Magma_Cream:1325513690329513987> | Estilingue\n' +
                        '<:Agua:1325511880847917149> | Água\n' +
                        '<:escada:1325512342108377190> | Escadas (Proibidas apenas em proteções)\n' +
                        '<:Invisibilidade:1325512367617999012> | Poções antes do BedBreak\n' +
                        '<:diamond_sword:1325512395027648553> | Espadas de diamante antes do BedBreak';
                        
            let regrasAdicionais = '❗ É totalmente proibido o uso do comando `/nick` durante partidas.';

            if (fs.existsSync(configPath)) {
                const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
                regras = config.regras || regras;
                regrasAdicionais = config.regrasAdicionais || regrasAdicionais;
            }

            const embed = new EmbedBuilder()
                .setTitle(`『 SISTEMA DE TICKET 』- ${interaction.guild.name.toUpperCase()}`)
                .setDescription('Selecione uma das opções abaixo para criar um ticket.')
                .setColor('#ff5555')
                .addFields(
                    { 
                        name: '<:Icon_Channel_Rules:1325512517820219453> REGRAS DA ARANKED',
                        value: regras,
                        inline: false
                    },
                    {
                        name: '『 REGRAS ADICIONAIS 』',
                        value: regrasAdicionais,
                        inline: false
                    },
                    { 
                        name: '『 OPÇÕES DISPONÍVEIS 』',
                        value: [
                            '<:diamond_sword:1325512395027648553> **Clan x Clan**',
                            '➥ Crie um ticket para organizar CxC',
                            '',
                            '<a:Spinning_Nether_Star:1318567273576927292> **Parceria**',
                            '➥ Crie um ticket para parcerias',
                            '',
                            '👥 **Recrutamento**',
                            '➥ Faça recrutamento para entrar no Clan',
                        ].join('\n'),
                        inline: false 
                    }
                )
                .setThumbnail(interaction.guild.iconURL({ dynamic: true, size: 256 }))
                .setFooter({ 
                    text: `${interaction.guild.name} - Desenvolvido por Rezando.`,
                    iconURL: interaction.guild.iconURL({ dynamic: true })
                });

            const cxcButton = new ButtonBuilder()
                .setCustomId('cxc')
                .setLabel('Clan x Clan')
                .setEmoji('<:diamond_sword:1325512395027648553>')
                .setStyle(ButtonStyle.Primary);

            const parceriaButton = new ButtonBuilder()
                .setCustomId('parceria')
                .setLabel('Parceria')
                .setEmoji('<a:Spinning_Nether_Star:1318567273576927292>')
                .setStyle(ButtonStyle.Secondary);

            const candidatarButton = new ButtonBuilder()
                .setCustomId('apply_recruitment')
                .setLabel('📝 Candidatar-se')
                .setStyle(ButtonStyle.Success);

            const arankedButton = new ButtonBuilder()
                .setCustomId('apply_aranked')
                .setLabel('👑 ARANKED')
                .setStyle(ButtonStyle.Primary);

            const row = new ActionRowBuilder()
                .addComponents(cxcButton, parceriaButton, candidatarButton, arankedButton);

            await interaction.editReply({
                embeds: [embed],
                components: [row]
            });

        } catch (error) {
            console.error('Erro ao criar o painel de administração:', error);
            if (interaction.deferred) {
                await interaction.editReply({
                    content: '❌ Não foi possível criar o painel de administração.',
                    ephemeral: true
                });
            }
        }
    },

    async handleButton(interaction) {
        if (!interaction.isButton()) return;
        
        try {
            console.log('Button interaction received:', interaction.customId);
            
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
                    break;
                }
                case 'accept_cxc': {
                    if (!interaction.member.permissions.has('ManageMessages')) {
                        return await interaction.reply({
                            content: '❌ Você não tem permissão para aceitar CxC!',
                            ephemeral: true
                        });
                    }

                    await interaction.deferUpdate();
                    const embed = interaction.message.embeds[0];
                    const updatedEmbed = EmbedBuilder.from(embed)
                        .setColor('#00ff00')
                        .addFields({
                            name: '✅ Status',
                            value: `Aceito por ${interaction.user}`,
                            inline: false
                        });

                    const row = new ActionRowBuilder()
                        .addComponents(
                            new ButtonBuilder()
                                .setCustomId('close_ticket')
                                .setLabel('🔒 Fechar Ticket')
                                .setStyle(ButtonStyle.Danger)
                        );

                    await interaction.message.edit({
                        embeds: [updatedEmbed],
                        components: [row]
                    });
                    break;
                }
                case 'decline_cxc': {
                    if (!interaction.member.permissions.has('ManageMessages')) {
                        return await interaction.reply({
                            content: '❌ Você não tem permissão para recusar CxC!',
                            ephemeral: true
                        });
                    }

                    await interaction.deferUpdate();
                    const embed = interaction.message.embeds[0];
                    const updatedEmbed = EmbedBuilder.from(embed)
                        .setColor('#ff0000')
                        .addFields({
                            name: '❌ Status',
                            value: `Recusado por ${interaction.user}`,
                            inline: false
                        });

                    const row = new ActionRowBuilder()
                        .addComponents(
                            new ButtonBuilder()
                                .setCustomId('close_ticket')
                                .setLabel('🔒 Fechar Ticket')
                                .setStyle(ButtonStyle.Danger)
                        );

                    await interaction.message.edit({
                        embeds: [updatedEmbed],
                        components: [row]
                    });
                    break;
                }
                case 'apply_recruitment':
                    await interaction.client.recruitmentManager.handleRecruitmentButton(interaction);
                    break;
                case 'apply_aranked':
                    await interaction.client.recruitmentManager.handleArankedRecruitment(interaction);
                    break;
                default:
                    break;
            }
        } catch (error) {
            console.error('Erro ao processar interação:', error);
            const errorMessage = '❌ Ocorreu um erro ao processar sua solicitação.';
            if (interaction.replied || interaction.deferred) {
                await interaction.editReply({ content: errorMessage, ephemeral: true });
            } else {
                await interaction.reply({ content: errorMessage, ephemeral: true });
            }
        }
    }
};
