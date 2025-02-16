const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, StringSelectMenuBuilder } = require('discord.js');
const axios = require('axios');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('duels')
        .setDescription('[Mush] Verifique as estatísticas de duelos de um jogador no MushMC.')
        .addStringOption(option =>
            option
                .setName('nick')
                .setDescription('Nome de usuário do jogador')
                .setRequired(true)),
    
    async execute(interaction) {
        try {
            await interaction.deferReply();
            const username = interaction.options.getString('nick');
            
            const response = await axios.get(`https://mush.com.br/api/player/${username}`);
            const data = response.data;

            if (!data?.response?.stats?.duels) {
                return await interaction.editReply({
                    content: 'Estatísticas de duelos não encontradas.',
                    ephemeral: true
                });
            }

            const duelsStats = data.response.stats.duels;
            const playTime = data.response.play_time;
            const uniqueId = data.response.account.unique_id;

            const embed = createEmbed(username, duelsStats, playTime, 'duels', uniqueId);
            const mainMenu = new StringSelectMenuBuilder()
                .setCustomId('duels-select')
                .setPlaceholder('Selecione um modo de jogo')
                .addOptions(getMainModesOptions());

            const row = new ActionRowBuilder().addComponents(mainMenu);

            const message = await interaction.editReply({
                content: '<:Mush:1324516271588376718> » Entre no [**servidor de suporte do BOT!**](https://discord.gg/gp97MzATnG)',
                embeds: [embed],
                components: [row]
            });

            const collector = message.createMessageComponentCollector({
                componentType: 3,
                time: 60000
            });

            // Criar uma variável para armazenar o modo atual
            let currentBaseMode = 'duels';

            collector.on('collect', async i => {
                if (i.user.id !== interaction.user.id) return;

                try {
                    const selectedMode = i.values[0];

                    if (selectedMode === 'back') {
                        // Resetar o modo atual e voltar ao menu principal
                        currentBaseMode = 'duels';
                        await i.update({
                            embeds: [createEmbed(username, duelsStats, playTime, 'duels', uniqueId)],
                            components: [row]
                        });
                        return;
                    }

                    // Se for um modo principal, atualizar o currentBaseMode
                    if (!selectedMode.includes('_solo') && !selectedMode.includes('_doubles')) {
                        currentBaseMode = selectedMode;
                    }

                    // Criar o menu do modo atual
                    const modeMenu = new StringSelectMenuBuilder()
                        .setCustomId('duels-mode')
                        .setPlaceholder(`Selecione o tipo de ${currentBaseMode.replace(/_/g, ' ')}`)
                        .addOptions([
                            ...getModeOptions(currentBaseMode),
                            { label: '« Voltar ao menu principal', value: 'back' }
                        ]);

                    const modeRow = new ActionRowBuilder().addComponents(modeMenu);
                    const embed = createEmbed(username, duelsStats, playTime, selectedMode, uniqueId);
                    
                    await i.update({
                        embeds: [embed],
                        components: [modeRow]
                    });
                } catch (error) {
                    console.error('Error in collector:', error);
                }
            });

            collector.on('end', () => {
                interaction.editReply({ components: [] }).catch(() => {});
            });

        } catch (error) {
            console.error('Erro ao obter as estatísticas:', error);
            if (interaction.deferred) {
                await interaction.editReply({
                    content: 'Não foi possível obter as estatísticas do jogador.',
                    ephemeral: true,
                    components: []
                });
            } else {
                await interaction.reply({
                    content: 'Não foi possível obter as estatísticas do jogador.',
                    ephemeral: true
                });
            }
        }
    },
};

function getMainModesOptions() {
    return [
        { label: 'Bed Fight', value: 'bed_fight' },
        { label: 'Fireball Fight', value: 'fireball_fight' },
        { label: 'UHC', value: 'uhc' },
        { label: 'Sumo', value: 'sumo' },
        { label: 'Sopa', value: 'soup' },
        { label: 'Gladiator', value: 'gladiator' },
        { label: 'No Debuff', value: 'no_debuff' },
        { label: 'Combo', value: 'combo' },
        { label: 'Gapple', value: 'gapple' },
        { label: 'Lava', value: 'lava' }
    ];
}

function getModeOptions(baseMode) {
    const formatName = (name) => name.charAt(0).toUpperCase() + name.slice(1).replace(/_/g, ' ');
    
    if (baseMode === 'sumo') {
        return [
            { label: 'Sumo', value: 'sumo' }
        ];
    }

    return [
        { label: `${formatName(baseMode)} - Total`, value: baseMode },
        { label: `${formatName(baseMode)} - Solo`, value: `${baseMode}_solo` },
        { label: `${formatName(baseMode)} - Dupla`, value: `${baseMode}_doubles` }
    ];
}

function getModeName(mode) {
    const [base, sub] = mode.split('_');
    if (sub === 'solo') return `${base.charAt(0).toUpperCase() + base.slice(1).replace(/_/g, ' ')} Solo`;
    if (sub === 'doubles') return `${base.charAt(0).toUpperCase() + base.slice(1).replace(/_/g, ' ')} Dupla`;
    return base.charAt(0).toUpperCase() + base.slice(1).replace(/_/g, ' ');
}

function createEmbed(username, duelsStats, playTime, mode = 'duels', uniqueId) {
    let stats = {
        wins: 0,
        losses: 0,
        kills: 0,
        deaths: 0,
        winstreak: 0,
        max_winstreak: 0,
        xp: 0,
        beds_broken: 0,
        games_played: 0,
        level: 0
    };

    if (mode === 'duels') {
        // Calcular estatísticas totais
        ['bed_fight', 'fireball_fight', 'sumo', 'uhc', 'soup', 'gladiator', 'no_debuff', 'combo', 'gapple', 'lava'].forEach(gameMode => {
            stats.wins += Number(duelsStats[`${gameMode}_wins`] || 0);
            stats.losses += Number(duelsStats[`${gameMode}_losses`] || 0);
            stats.kills += Number(duelsStats[`${gameMode}_kills`] || 0);
            stats.deaths += Number(duelsStats[`${gameMode}_deaths`] || 0);
            stats.beds_broken += Number(duelsStats[`${gameMode}_beds_broken`] || 0);
            
            // Winstreak e Max Winstreak
            const currentWinstreak = Number(duelsStats[`${gameMode}_winstreak`] || 0);
            const maxWinstreak = Number(duelsStats[`${gameMode}_max_winstreak`] || 0);
            stats.winstreak = Math.max(stats.winstreak, currentWinstreak);
            stats.max_winstreak = Math.max(stats.max_winstreak, maxWinstreak);
            
            // XP
            stats.xp += Number(duelsStats[`${gameMode}_xp`] || 0);
            
            // Games played
            stats.games_played += Number(duelsStats[`${gameMode}_played`] || 0);

            // Level
            const modeLevel = Number(duelsStats[`${gameMode}_level`] || 0);
            stats.level = Math.max(stats.level, modeLevel);
        });
    } else {
        // Corrigir lógica de modos e submodos
        let baseMode, subMode, prefix;

        // Tratar modo doubles especificamente
        if (mode.endsWith('_doubles')) {
            baseMode = mode.replace('_doubles', '');
            subMode = 'doubles';
            prefix = `${baseMode}_doubles`;
        } 
        // Tratar modo solo
        else if (mode.endsWith('_solo')) {
            baseMode = mode.replace('_solo', '');
            subMode = 'solo';
            prefix = `${baseMode}_solo`;
        }
        // Tratar modo base (total)
        else {
            baseMode = mode;
            prefix = mode;
        }

        console.log('Mode processing:', {
            original: mode,
            baseMode,
            subMode,
            prefix,
            availableStats: Object.keys(duelsStats).filter(k => k.startsWith(baseMode))
        });

        // Pegar as estatísticas usando o prefixo correto
        stats = {
            wins: Number(duelsStats[`${prefix}_wins`] || 0),
            losses: Number(duelsStats[`${prefix}_losses`] || 0),
            kills: Number(duelsStats[`${prefix}_kills`] || 0),
            deaths: Number(duelsStats[`${prefix}_deaths`] || 0),
            winstreak: Number(duelsStats[`${prefix}_winstreak`] || 0),
            max_winstreak: Number(duelsStats[`${prefix}_max_winstreak`] || 0),
            xp: Number(duelsStats[`${baseMode}_xp`] || 0),
            beds_broken: Number(duelsStats[`${prefix}_beds_broken`] || 0),
            games_played: Number(duelsStats[`${prefix}_played`] || 
                             (Number(duelsStats[`${prefix}_wins`] || 0) + 
                              Number(duelsStats[`${prefix}_losses`] || 0))),
            level: Number(duelsStats[`${baseMode}_level`] || 0)
        };

        // Debug das estatísticas encontradas
        console.log('Stats found:', {
            prefix,
            mode: mode,
            baseMode,
            subMode,
            wins: stats.wins,
            level: stats.level
        });
    }

    // Calculate ratios
    const kdr = (stats.kills / (stats.deaths || 1)).toFixed(2);
    const wlr = (stats.wins / (stats.losses || 1)).toFixed(2);
    const winRate = ((stats.wins / (stats.wins + stats.losses || 1)) * 100).toFixed(1);

    // Format level with symbol based on level value
    const getLevelSymbol = (level) => {
        if (level >= 100) return '⚔';
        if (level >= 75) return '✤';
        if (level >= 50) return '✣';
        if (level >= 25) return '✦';
        return '✫';
    };

    // Certifique-se de que o nível está sendo formatado corretamente
    const formattedLevel = `[${stats.level}${getLevelSymbol(stats.level)}]`;
    console.log('Formatted Level:', formattedLevel);

    return new EmbedBuilder()
        .setTitle(`${username} - ${getModeName(mode)}`)
        .setColor('#0099ff')
        .setThumbnail(`https://visage.surgeplay.com/face/256/${uniqueId}`)
        .addFields(
            {
                name: '『 Status Gerais 』',
                value: [
                    `➥ Nível: **${formattedLevel}**`,
                    `➥ XP: **${stats.xp.toLocaleString()}**`,
                    `➥ Winstreak: **${stats.winstreak}**`,
                    `➥ Maior Winstreak: **${stats.max_winstreak}**`
                ].join('\n'),
                inline: false
            },
            {
                name: '『 Partidas 』',
                value: [
                    `➥ Vitórias: **${stats.wins.toLocaleString()}** (${winRate}%)`,
                    `➥ Derrotas: **${stats.losses.toLocaleString()}**`,
                    `➥ W/L: **${wlr}**`,
                    `➥ Partidas Jogadas: **${stats.games_played.toLocaleString()}**`
                ].join('\n'),
                inline: true
            },
            {
                name: '『 Combate 』',
                value: [
                    `➥ Abates: **${stats.kills.toLocaleString()}**`,
                    `➥ Mortes: **${stats.deaths.toLocaleString()}**`,
                    `➥ K/D: **${kdr}**`,
                    `➥ Camas Quebradas: **${stats.beds_broken.toLocaleString()}**`
                ].join('\n'),
                inline: true
            }
        )
        .setFooter({ 
            text: 'Desenvolvido por Rezando',
            iconURL: 'https://cdn.discordapp.com/avatars/1283948475742031912/fb0b536e1dad49337d09d5d67504a8b2.png'
        })
        .setTimestamp();
}

// Adicione esta função para converter cores do Minecraft para texto Discord
function formatMinecraftColor(text) {
    if (!text) return '[0✫]';
    return text.replace(/&[0-9a-fk-or]/g, '');
}
