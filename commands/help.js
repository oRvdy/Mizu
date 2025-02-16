const { 
    SlashCommandBuilder, 
    EmbedBuilder,
    ActionRowBuilder,
    StringSelectMenuBuilder
} = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('help')
        .setDescription('[Mizu] Mostra todos os comandos disponíveis do Mizu.'),

    async execute(interaction) {
        const commands = {
            stats: {
                category: "📊 Estatísticas",
                commands: [
                    { 
                        name: "/bedwars",
                        desc: "Ver estatísticas do BedWars",
                        emoji: "<:Caminha:1324521740411605002>"
                    },
                    {
                        name: "/comparar",
                        desc: "Comparar estatísticas entre jogadores",
                        emoji: "⚔️"
                    },
                    {
                        name: "/leaderboard",
                        desc: "Ver rankings do servidor",
                        emoji: "🏆"
                    },
                    {
                        name: "/duels",
                        desc: "Ver estatísticas de Duels",
                        emoji: "🎯"
                    }
                ]
            },
            clan: {
                category: "👥 Clan",
                commands: [
                    {
                        name: "/clan meta",
                        desc: "Criar grupo de metas do clan",
                        emoji: "📋"
                    },
                    {
                        name: "/clan status",
                        desc: "Ver progresso das metas",
                        emoji: "📊"
                    },
                    {
                        name: "/clan top",
                        desc: "Ver top contribuidores",
                        emoji: "🏅"
                    },
                    {
                        name: "/clan add",
                        desc: "Adicionar membro ao grupo",
                        emoji: "➕"
                    },
                    {
                        name: "/clan estatisticas",
                        desc: "Ver estatísticas do clan",
                        emoji: "📈"
                    },
                    {
                        name: "/clan ranking",
                        desc: "Ver ranking global dos clans",
                        emoji: "🌍"
                    }
                ]
            },
            admin: {
                category: "⚙️ Administração",
                commands: [
                    {
                        name: "/admincxc",
                        desc: "Configurar sistema de CxC e Parcerias",
                        emoji: "🛠️"
                    },
                    {
                        name: "/configurar",
                        desc: "Configurar sistema de tickets",
                        emoji: "⚙️"
                    },
                    {
                        name: "/license",
                        desc: "Gerenciar licenças premium",
                        emoji: "💎"
                    }
                ]
            },
            util: {
                category: "🔧 Utilidades",
                commands: [
                    {
                        name: "/botinfo",
                        desc: "Ver informações sobre o Mizu",
                        emoji: "ℹ️"
                    },
                    {
                        name: "/help",
                        desc: "Mostra esta mensagem de ajuda",
                        emoji: "❓"
                    }
                ]
            }
        };

        // Criar select menu para categorias
        const select = new StringSelectMenuBuilder()
            .setCustomId('help-category')
            .setPlaceholder('Selecione uma categoria')
            .addOptions(
                Object.entries(commands).map(([key, value]) => ({
                    label: value.category,
                    description: `Ver comandos da categoria ${value.category}`,
                    value: key,
                    emoji: value.category.split(' ')[0]
                }))
            );

        const row = new ActionRowBuilder().addComponents(select);

        // Embed principal
        const mainEmbed = new EmbedBuilder()
            .setTitle('『❓』Sistema de Ajuda')
            .setColor('#2b2d31')
            .setDescription(`
                ### <:Mush:1325298452812271676> Bem-vindo ao sistema de ajuda!
                > Selecione uma categoria no menu abaixo para ver os comandos disponíveis.
                
                ### 📌 Categorias Disponíveis
                > 📊 **Estatísticas** - Comandos de stats do servidor
                > 👥 **Clan** - Sistema de clans e metas
                > ⚙️ **Administração** - Comandos administrativos
                > 🔧 **Utilidades** - Comandos úteis gerais

                ### 💎 Premium
                > Alguns comandos requerem uma licença premium.
                > Use \`/license info\` para mais informações.
            `)
            .setThumbnail(interaction.client.user.displayAvatarURL())
            .setFooter({ 
                text: 'Desenvolvido por Rezando',
                iconURL: 'https://cdn.discordapp.com/avatars/1283948475742031912/fb0b536e1dad49337d09d5d67504a8b2.png'
            });

        const message = await interaction.reply({
            embeds: [mainEmbed],
            components: [row],
            fetchReply: true
        });

        // Coletor para o select menu
        const collector = message.createMessageComponentCollector({
            filter: i => i.user.id === interaction.user.id,
            time: 60000
        });

        collector.on('collect', async i => {
            const category = commands[i.values[0]];
            
            const categoryEmbed = new EmbedBuilder()
                .setTitle(`『${category.category.split(' ')[0]}』${category.category.split(' ')[1]}`)
                .setColor('#2b2d31')
                .setDescription(
                    category.commands.map(cmd => 
                        `### ${cmd.emoji} ${cmd.name}\n> ${cmd.desc}`
                    ).join('\n\n')
                )
                .setFooter({ 
                    text: `${interaction.guild.name} • Use o menu para navegar entre categorias`,
                    iconURL: interaction.guild.iconURL({ dynamic: true })
                });

            await i.update({
                embeds: [categoryEmbed],
                components: [row]
            });
        });

        collector.on('end', () => {
            row.components[0].setDisabled(true);
            interaction.editReply({
                components: [row]
            }).catch(() => {});
        });
    }
};
