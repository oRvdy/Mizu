const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, StringSelectMenuBuilder } = require('discord.js');
const axios = require('axios');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('bedwars')
        .setDescription('[Mush] Verifique as estatísticas Gerais de um jogador no Bed Wars.')
        .addStringOption(option =>
            option
                .setName('nick')
                .setDescription('Nome de usuário do jogador')
                .setRequired(true)),
    
    async execute(interaction) {
        console.log('Command executed:', interaction.commandName);
        const username = interaction.options.getString('nick');
        console.log('Username:', username);
        try {
            const response = await axios.get(`https://mush.com.br/api/player/${username}`);
            const data = response.data;

            console.log('Resposta da API:', data);

            if (!data || !data.response || !data.response.stats || !data.response.stats.bedwars) {
                throw new Error('Estatísticas não encontradas');
            }

            const bedwarsStats = data.response.stats.bedwars;
            const playTime = data.response.stats.play_time.bedwars;
            const modes = ['geral', 'solo', 'dupla', 'trio', 'quarteto'];

            const selectMenu = new StringSelectMenuBuilder()
                .setCustomId('select-mode')
                .setPlaceholder('Selecione um modo')
                .addOptions(modes.map(mode => ({
                    label: mode.charAt(0).toUpperCase() + mode.slice(1),
                    value: mode,
                })));

            const row = new ActionRowBuilder().addComponents(selectMenu);

            const embed = createEmbed(username, bedwarsStats, bedwarsStats, data.response.account.unique_id, playTime);

            await interaction.reply({
                content: '<:Mush:1324516271588376718> » Entre no [**servidor de suporte do BOT!**](https://discord.gg/gp97MzATnG)', // Use o ID do emoji aqui
                embeds: [embed],
                components: [row],
            });

            const filter = i => i.customId === 'select-mode' && i.user.id === interaction.user.id;
            const collector = interaction.channel.createMessageComponentCollector({ filter, time: 60000 });

            collector.on('collect', async i => {
                const selectedMode = i.values[0];
                let stats;

                switch (selectedMode) {
                    case 'solo':
                        stats = {
                            beds_broken: bedwarsStats.solo_beds_broken,
                            beds_lost: bedwarsStats.solo_beds_lost,
                            kills: bedwarsStats.solo_kills,
                            deaths: bedwarsStats.solo_deaths,
                            assists: bedwarsStats.solo_assists,
                            final_kills: bedwarsStats.solo_final_kills,
                            final_deaths: bedwarsStats.solo_final_deaths,
                            final_assists: bedwarsStats.solo_final_assists,
                            wins: bedwarsStats.solo_wins,
                            losses: bedwarsStats.solo_losses,
                            games_played: bedwarsStats.solo_games_played,
                            winstreak: bedwarsStats.solo_winstreak,
                            max_winstreak: bedwarsStats.solo_max_winstreak,
                        };
                        break;
                    case 'dupla':
                        stats = {
                            beds_broken: bedwarsStats.doubles_beds_broken,
                            beds_lost: bedwarsStats.doubles_beds_lost,
                            kills: bedwarsStats.doubles_kills,
                            deaths: bedwarsStats.doubles_deaths,
                            assists: bedwarsStats.doubles_assists,
                            final_kills: bedwarsStats.doubles_final_kills,
                            final_deaths: bedwarsStats.doubles_final_deaths,
                            final_assists: bedwarsStats.doubles_final_assists,
                            wins: bedwarsStats.doubles_wins,
                            losses: bedwarsStats.doubles_losses,
                            games_played: bedwarsStats.doubles_games_played,
                            winstreak: bedwarsStats.doubles_winstreak,
                            max_winstreak: bedwarsStats.doubles_max_winstreak,
                        };
                        break;
                    case 'trio':
                        stats = {
                            beds_broken: bedwarsStats['3v3v3v3_beds_broken'],
                            beds_lost: bedwarsStats['3v3v3v3_beds_lost'],
                            kills: bedwarsStats['3v3v3v3_kills'],
                            deaths: bedwarsStats['3v3v3v3_deaths'],
                            assists: bedwarsStats['3v3v3v3_assists'],
                            final_kills: bedwarsStats['3v3v3v3_final_kills'],
                            final_deaths: bedwarsStats['3v3v3v3_final_deaths'],
                            final_assists: bedwarsStats['3v3v3v3_final_assists'],
                            wins: bedwarsStats['3v3v3v3_wins'],
                            losses: bedwarsStats['3v3v3v3_losses'],
                            games_played: bedwarsStats['3v3v3v3_games_played'],
                            winstreak: bedwarsStats['3v3v3v3_winstreak'],
                            max_winstreak: bedwarsStats['3v3v3v3_max_winstreak'],
                        };
                        break;
                    case 'quarteto':
                        stats = {
                            beds_broken: bedwarsStats['4v4v4v4_beds_broken'],
                            beds_lost: bedwarsStats['4v4v4v4_beds_lost'],
                            kills: bedwarsStats['4v4v4v4_kills'],
                            deaths: bedwarsStats['4v4v4v4_deaths'],
                            assists: bedwarsStats['4v4v4v4_assists'],
                            final_kills: bedwarsStats['4v4v4v4_final_kills'],
                            final_deaths: bedwarsStats['4v4v4v4_final_deaths'],
                            final_assists: bedwarsStats['4v4v4v4_final_assists'],
                            wins: bedwarsStats['4v4v4v4_wins'],
                            losses: bedwarsStats['4v4v4v4_losses'],
                            games_played: bedwarsStats['4v4v4v4_games_played'],
                            winstreak: bedwarsStats['4v4v4v4_winstreak'],
                            max_winstreak: bedwarsStats['4v4v4v4_max_winstreak'],
                        };
                        break;
                    default:
                        stats = bedwarsStats;
                }

                if (!stats) {
                    await i.update({ content: 'Estatísticas não encontradas para o modo selecionado.', components: [] });
                    return;
                }

                const updatedEmbed = createEmbed(username, bedwarsStats, stats, data.response.account.unique_id, playTime, selectedMode);

                await i.update({ embeds: [updatedEmbed], components: [row] });
            });

            collector.on('end', collected => {
                if (collected.size === 0) {
                    interaction.editReply({ content: 'Tempo esgotado para selecionar um modo.', components: [] });
                }
            });
        } catch (error) {
            console.error('Erro ao obter as estatísticas do jogador:', error.message);
            if (!interaction.replied) {
                await interaction.reply('Não foi possível obter as estatísticas do jogador.');
            }
        }
    },
};

function createEmbed(username, bedwarsStats, stats, uniqueId, playTime, mode = 'geral') {
    const kdr = stats?.deaths ? (stats.kills / stats.deaths).toFixed(2) : 'N/A';
    const wlr = stats?.losses ? (stats.wins / stats.losses).toFixed(2) : 'N/A';
    const fkdr = stats?.final_deaths ? (stats.final_kills / stats.final_deaths).toFixed(2) : 'N/A';
    const bblr = stats?.beds_lost ? (stats.beds_broken / stats.beds_lost).toFixed(2) : 'N/A';

    return new EmbedBuilder()
        .setTitle(`<:Caminha:1324521740411605002>・Bed Wars (${mode.charAt(0).toUpperCase() + mode.slice(1)}): ${username}`) // Use o ID do emoji aqui
        .setColor('#0099ff')
        .setThumbnail(`https://visage.surgeplay.com/face/256/${uniqueId}`) // URL para obter a cabeça do jogador
        .setDescription(`
            \`•\` **Nível**: [${bedwarsStats.level || 'N/A'}✽]
            \`•\` **XP**: ${bedwarsStats.xp?.toLocaleString() || 'N/A'} ➜ [${bedwarsStats.xp % 15000}/15.000]

            \`•\` **Camas quebradas**: ${stats?.beds_broken?.toLocaleString() || 'N/A'}
            \`•\` **Camas perdidas**: ${stats?.beds_lost?.toLocaleString() || 'N/A'}

            \`•\` **Abates**: ${stats?.kills?.toLocaleString() || 'N/A'}
            \`•\` **Mortes**: ${stats?.deaths?.toLocaleString() || 'N/A'}
            \`•\` **Assistências**: ${stats?.assists?.toLocaleString() || 'N/A'}

            \`•\` **Abates finais**: ${stats?.final_kills?.toLocaleString() || 'N/A'}
            \`•\` **Mortes finais**: ${stats?.final_deaths?.toLocaleString() || 'N/A'}
            \`•\` **Assistências finais**: ${stats?.final_assists?.toLocaleString() || 'N/A'}

            \`•\` **Vitórias**: ${stats?.wins?.toLocaleString() || 'N/A'} (${((stats?.wins / stats?.games_played) * 100).toFixed(2) || 'N/A'}%)
            \`•\` **Derrotas**: ${stats?.losses?.toLocaleString() || 'N/A'}
            \`•\` **Partidas jogadas**: ${stats?.games_played?.toLocaleString() || 'N/A'}
            \`•\` **Tempo online**: ${(playTime / 3600).toFixed(2)} horas

            \`•\` **Winstreak**: ${stats?.winstreak?.toLocaleString() || 'N/A'}
            \`•\` **Maior Winstreak**: ${stats?.max_winstreak?.toLocaleString() || 'N/A'}

            \`•\` **KDR**: ${kdr}
            \`•\` **WLR**: ${wlr}
            \`•\` **FKDR**: ${fkdr}
            \`•\` **BBLR**: ${bblr}
        `)
        .setFooter({ text: 'Desenvolvido por Rezando', iconURL: 'https://cdn.discordapp.com/avatars/1283948475742031912/fb0b536e1dad49337d09d5d67504a8b2.png' }) // Substitua pela URL do logo do MushMC, se disponível
        .setTimestamp();
}