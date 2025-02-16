const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const axios = require('axios');
const fs = require('fs');
const path = require('path');

const stateFilePath = path.join(__dirname, 'skywars_state.json');

module.exports = {
    data: {
        name: 'skywars',
        description: '[Mush] Verifique as estatísticas de um jogador no Sky Wars.',
        options: [
            {
                name: 'nick',
                type: 3, // STRING type
                description: 'Nome de usuário do jogador',
                required: true,
            },
        ],
    },
    async execute(interaction) {
        console.log('Command executed:', interaction.commandName);
        const username = interaction.options.getString('nick');
        console.log('Username:', username);
        try {
            const response = await axios.get(`https://mush.com.br/api/player/${username}`);
            const data = response.data;

            console.log('Resposta da API:', data);

            if (!data || !data.response || !data.response.stats || !data.response.stats.skywars_r1) {
                throw new Error('Estatísticas não encontradas');
            }

            const skywarsStats = data.response.stats.skywars_r1;
            const playTime = data.response.stats.play_time.skywars;

            const buttons = new ActionRowBuilder().addComponents(
                new ButtonBuilder()
                    .setCustomId('total')
                    .setLabel('Total')
                    .setStyle(ButtonStyle.Secondary),
                new ButtonBuilder()
                    .setCustomId('solo')
                    .setLabel('Solo')
                    .setStyle(ButtonStyle.Secondary),
                new ButtonBuilder()
                    .setCustomId('duplas')
                    .setLabel('Duplas')
                    .setStyle(ButtonStyle.Secondary),
                new ButtonBuilder()
                    .setCustomId('1v1')
                    .setLabel('1v1')
                    .setStyle(ButtonStyle.Secondary),
                new ButtonBuilder()
                    .setCustomId('2v2')
                    .setLabel('2v2')
                    .setStyle(ButtonStyle.Secondary)
            );

            const embed = createEmbed(username, skywarsStats, skywarsStats, data.response.account.unique_id, playTime);

            await interaction.reply({
                content: '<:Mush:1324516271588376718> » Entre no [**servidor de suporte do BOT!**](https://discord.gg/gp97MzATnG)', // Use o ID do emoji aqui
                embeds: [embed],
                components: [buttons],
            });

            saveState(username, skywarsStats, data.response.account.unique_id, playTime);

            const filter = i => ['total', 'solo', 'duplas', '1v1', '2v2'].includes(i.customId) && i.user.id === interaction.user.id;
            const collector = interaction.channel.createMessageComponentCollector({ filter, time: 60000 });

            collector.on('collect', async i => {
                let stats;
                let selectedKit;
                switch (i.customId) {
                    case 'solo':
                        stats = {
                            kills: skywarsStats.kills_solo,
                            deaths: skywarsStats.deaths_solo,
                            wins: skywarsStats.wins_solo,
                            losses: skywarsStats.losses_solo,
                            games_played: skywarsStats.games_played_solo,
                            winstreak: skywarsStats.winstreak_solo,
                            max_winstreak: skywarsStats.max_winstreak_solo,
                        };
                        selectedKit = skywarsStats.solo_selected_kit;
                        break;
                    case 'duplas':
                        stats = {
                            kills: skywarsStats.kills_doubles,
                            deaths: skywarsStats.deaths_doubles,
                            wins: skywarsStats.wins_doubles,
                            losses: skywarsStats.losses_doubles,
                            games_played: skywarsStats.games_played_doubles,
                            winstreak: skywarsStats.winstreak_doubles,
                            max_winstreak: skywarsStats.max_winstreak_normal,
                        };
                        selectedKit = skywarsStats.team_selected_kit;
                        break;
                    case '1v1':
                        stats = {
                            kills: skywarsStats.kills_1v1,
                            deaths: skywarsStats.deaths_1v1,
                            wins: skywarsStats.wins_1v1,
                            losses: skywarsStats.losses_1v1,
                            games_played: skywarsStats.games_played_1v1,
                            winstreak: skywarsStats.winstreak_1v1,
                            max_winstreak: skywarsStats.max_winstreak_1v1,
                        };
                        selectedKit = skywarsStats.solo_selected_kit;
                        break;
                    case '2v2':
                        stats = {
                            kills: skywarsStats.kills_2v2,
                            deaths: skywarsStats.deaths_2v2,
                            wins: skywarsStats.wins_2v2,
                            losses: skywarsStats.losses_2v2,
                            games_played: skywarsStats.games_played_2v2,
                            winstreak: skywarsStats.winstreak_2v2,
                            max_winstreak: skywarsStats.max_winstreak_2v2,
                        };
                        selectedKit = skywarsStats.team_selected_kit;
                        break;
                    default:
                        stats = skywarsStats;
                        selectedKit = skywarsStats.solo_selected_kit;
                }

                if (!stats) {
                    await i.update({ content: 'Estatísticas não encontradas para o modo selecionado.', components: [] });
                    return;
                }

                const updatedEmbed = createEmbed(username, skywarsStats, stats, data.response.account.unique_id, playTime, i.customId, selectedKit);

                const updatedButtons = new ActionRowBuilder().addComponents(
                    new ButtonBuilder()
                        .setCustomId('total')
                        .setLabel('Total')
                        .setStyle(i.customId === 'total' ? ButtonStyle.Success : ButtonStyle.Secondary),
                    new ButtonBuilder()
                        .setCustomId('solo')
                        .setLabel('Solo')
                        .setStyle(i.customId === 'solo' ? ButtonStyle.Success : ButtonStyle.Secondary),
                    new ButtonBuilder()
                        .setCustomId('duplas')
                        .setLabel('Duplas')
                        .setStyle(i.customId === 'duplas' ? ButtonStyle.Success : ButtonStyle.Secondary),
                    new ButtonBuilder()
                        .setCustomId('1v1')
                        .setLabel('1v1')
                        .setStyle(i.customId === '1v1' ? ButtonStyle.Success : ButtonStyle.Secondary),
                    new ButtonBuilder()
                        .setCustomId('2v2')
                        .setLabel('2v2')
                        .setStyle(i.customId === '2v2' ? ButtonStyle.Success : ButtonStyle.Secondary)
                );

                await i.update({ embeds: [updatedEmbed], components: [updatedButtons] });
            });

            collector.on('end', async collected => {
                if (collected.size === 0) {
                    if (!interaction.replied) {
                        await interaction.editReply({ content: 'Tempo esgotado para selecionar um modo.', components: [] });
                    }
                }
            });
        } catch (error) {
            console.error('Erro ao obter as estatísticas do jogador:', error.message);
            if (!interaction.replied) {
                await interaction.reply({ content: 'Não foi possível obter as estatísticas do jogador.', ephemeral: true });
            }
        }
    },
};

function createEmbed(username, skywarsStats, stats, uniqueId, playTime, mode = 'total', selectedKit = 'Frog') {
    const kdr = stats?.deaths ? (stats.kills / stats.deaths).toFixed(2) : '0.00';
    const wlr = stats?.losses ? (stats.wins / stats.losses).toFixed(2) : '0.00';

    return new EmbedBuilder()
        .setTitle(`<:Skywars:1324764979802411159>・Sky Wars (${mode.charAt(0).toUpperCase() + mode.slice(1)}): ${username}`) // Use o ID do emoji aqui
        .setColor('#0099ff')
        .setThumbnail(`https://visage.surgeplay.com/face/256/${uniqueId}`) // URL para obter a cabeça do jogador
        .setDescription(`
            \`•\` **Nível**: [${skywarsStats.level || '0'}✫]
            \`•\` **XP**: ${skywarsStats.xp?.toLocaleString() || '0.00'} ➜ [${skywarsStats.xp % 500}/500]

            \`•\` **Coins**: ${skywarsStats.coins?.toLocaleString() || '0'}
            \`•\` **Almas**: ${skywarsStats.souls?.toLocaleString() || '0'}
            \`•\` **Kit selecionado**: ${selectedKit}

            \`•\` **Abates**: ${stats?.kills?.toLocaleString() || '0'}
            \`•\` **Mortes**: ${stats?.deaths?.toLocaleString() || '0'}

            \`•\` **Vitórias**: ${stats?.wins?.toLocaleString() || '0'}
            \`•\` **Derrotas**: ${stats?.losses?.toLocaleString() || '0'}
            \`•\` **Partidas jogadas**: ${stats?.games_played?.toLocaleString() || '0'}
            \`•\` **Tempo online**: ${(playTime / 3600).toFixed(2)} horas

            \`•\` **Winstreak**: ${stats?.winstreak?.toLocaleString() || '0'}
            \`•\` **Maior Winstreak**: ${stats?.max_winstreak?.toLocaleString() || '0'}

            \`•\` **KDR**: ${kdr}
            \`•\` **WLR**: ${wlr}
        `)
        .setFooter({ text: 'Desenvolvido por Rezando', iconURL: 'https://cdn.discordapp.com/avatars/1283948475742031912/fb0b536e1dad49337d09d5d67504a8b2.png' }) // Substitua pela URL do logo do MushMC, se disponível
        .setTimestamp();
}

function saveState(username, skywarsStats, uniqueId, playTime) {
    const state = {
        username,
        skywarsStats,
        uniqueId,
        playTime
    };
    fs.writeFileSync(stateFilePath, JSON.stringify(state, null, 2));
}

function loadState() {
    if (fs.existsSync(stateFilePath)) {
        const state = JSON.parse(fs.readFileSync(stateFilePath));
        return state;
    }
    return null;
}
