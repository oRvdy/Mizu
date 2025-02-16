const { SlashCommandBuilder, EmbedBuilder, StringSelectMenuBuilder, ActionRowBuilder } = require('discord.js');
const axios = require('axios');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('leaderboard')
        .setDescription('[Mush] Veja os rankings do BedWars.'),
    async execute(interaction) {
        try {
            await interaction.deferReply();
            
            const selectMenu = new StringSelectMenuBuilder()
                .setCustomId('leaderboard-select')
                .setPlaceholder('Selecione um ranking')
                .addOptions([
                    { label: 'Nível', value: 'level' },
                    { label: 'Vitórias', value: 'wins' },
                    { label: 'Abates Finais', value: 'final_kills' },
                    { label: 'Abates', value: 'kills' },
                    { label: 'Camas Quebradas', value: 'beds_broken' },
                ]);

            const row = new ActionRowBuilder().addComponents(selectMenu);

            const embed = await createLeaderboardEmbed('level'); // Começa mostrando o ranking de nível

            await interaction.editReply({
                content: '<:Mush:1324516271588376718> » Rankings do BedWars',
                embeds: [embed],
                components: [row]
            });

            const collector = interaction.channel.createMessageComponentCollector({
                componentType: 3,
                filter: i => i.customId === 'leaderboard-select' && i.user.id === interaction.user.id,
                time: 60000
            });

            collector.on('collect', async i => {
                try {
                    const selectedType = i.values[0];
                    const updatedEmbed = await createLeaderboardEmbed(selectedType);
                    await i.update({ embeds: [updatedEmbed] });
                } catch (error) {
                    console.error('Erro no collector:', error);
                }
            });

            collector.on('end', () => {
                interaction.editReply({ components: [] }).catch(() => {});
            });

        } catch (error) {
            console.error('Erro ao criar leaderboard:', error);
            await interaction.editReply({
                content: 'Ocorreu um erro ao gerar o ranking. Por favor, tente novamente mais tarde.',
                ephemeral: true
            });
        }
    },
};

async function createLeaderboardEmbed(type) {
    const titles = {
        level: 'Top 10 Níveis',
        wins: 'Top 10 Vitórias',
        final_kills: 'Top 10 Abates Finais',
        kills: 'Top 10 Abates',
        beds_broken: 'Top 10 Camas Quebradas'
    };

    const response = await axios.get(`https://mush.com.br/api/leaderboards/bedwars/${type}`);
    const players = response.data.slice(0, 10);

    return new EmbedBuilder()
        .setTitle(`🏆 ${titles[type]} - BedWars`)
        .setColor('#0099ff')
        .setDescription(players.map((player, index) => {
            const badge = player.level_badge?.format.replace(/&[0-9a-fk-or]/g, '') || '';
            let statValue = '';
            
            switch(type) {
                case 'level':
                    statValue = `${badge} | XP: **${player.xp?.toLocaleString() || '0'}**`;
                    break;
                case 'wins':
                    statValue = `Vitórias: **${player.wins?.toLocaleString() || '0'}**`;
                    break;
                case 'final_kills':
                    statValue = `Abates Finais: **${player.final_kills?.toLocaleString() || '0'}**`;
                    break;
                case 'kills':
                    statValue = `Abates: **${player.kills?.toLocaleString() || '0'}**`;
                    break;
                case 'beds_broken':
                    statValue = `Camas Quebradas: **${player.beds_broken?.toLocaleString() || '0'}**`;
                    break;
            }

            return `**#${index + 1}** ${player.username}\n➥ ${statValue}\n`;
        }).join('\n'))
        .setFooter({
            text: 'Desenvolvido por Rezando',
            iconURL: 'https://cdn.discordapp.com/avatars/1283948475742031912/fb0b536e1dad49337d09d5d67504a8b2.png'
        })
        .setTimestamp();
}
