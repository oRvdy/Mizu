const { SlashCommandBuilder, AttachmentBuilder } = require('discord.js');
const { createCanvas, loadImage, registerFont } = require('canvas');
const axios = require('axios');
const path = require('path');

// Registrar fonte com caminho absoluto
registerFont(path.join(__dirname, '..', 'assets', 'Minecraft.ttf'), { family: 'Minecraft' });

// Configurações
const CONFIG = {
    timeout: 30000,
    headers: {
        'User-Agent': 'MizuBot/1.0',
        'Accept': 'application/json'
    },
    apiUrl: 'https://mush.com.br/api/player' // Corrigindo a URL da API
};

async function createComparisonImage(player1, player2, stats1, stats2, gameTitle, metrics) {
    const canvas = createCanvas(1200, 600);
    const ctx = canvas.getContext('2d');

    try {
        // Background e overlay ajustados
        const backgroundPath = path.join(__dirname, '..', 'assets', 'background.png'); // Usando caminho relativo
        const background = await loadImage(backgroundPath);
        
        // Fundo mais escuro
        ctx.fillStyle = '#0a0a0a';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        // Background com menos blur
        ctx.filter = 'blur(1px)';
        ctx.globalAlpha = 0.3;
        ctx.drawImage(background, 0, 0, canvas.width, canvas.height);
        ctx.filter = 'none';
        ctx.globalAlpha = 1;

        // Linha divisória central
        ctx.strokeStyle = '#333333';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(canvas.width/2, 100);
        ctx.lineTo(canvas.width/2, 500);
        ctx.stroke();

        // VS estilizado com efeitos
        function drawStylizedVS() {
            ctx.save();
            
            // Sombra externa
            ctx.shadowColor = '#ff0000';
            ctx.shadowBlur = 25;
            ctx.shadowOffsetX = 0;
            ctx.shadowOffsetY = 0;

            const vsY = canvas.height/2 + 20; // Ajustado de -30 para +20 para descer o VS

            // Camada base (contorno externo)
            ctx.font = 'bold 100px Minecraft';
            ctx.textAlign = 'center';
            ctx.fillStyle = '#660000';
            ctx.fillText('VS', canvas.width/2, vsY);

            // Camada intermediária
            ctx.shadowBlur = 15;
            ctx.fillStyle = '#990000';
            ctx.font = 'bold 95px Minecraft';
            ctx.fillText('VS', canvas.width/2, vsY);

            // Camada principal
            ctx.shadowBlur = 10;
            ctx.fillStyle = '#ff3333';
            ctx.font = 'bold 90px Minecraft';
            ctx.fillText('VS', canvas.width/2, vsY);

            // Brilho central
            ctx.shadowBlur = 5;
            ctx.fillStyle = '#ff6666';
            ctx.font = 'bold 85px Minecraft';
            ctx.fillText('VS', canvas.width/2, vsY);

            ctx.restore();
        }

        // Remover o VS anterior e chamar o novo VS estilizado
        drawStylizedVS();

        // Carregar e desenhar skins
        const [skin1, skin2] = await Promise.all([
            loadImage(`https://mc-heads.net/body/${player1}/180`),
            loadImage(`https://mc-heads.net/body/${player2}/180`)
        ]);

        // Ajuste das dimensões e posições
        const skinWidth = 140;
        const skinHeight = 350;
        const skinY = 150;
        
        // Posições X das skins para referência
        const skin1X = 80;
        const skin2X = 1120;

        // Desenhar skins
        ctx.drawImage(skin1, skin1X, skinY, skinWidth, skinHeight);
        ctx.save();
        ctx.scale(-1, 1);
        ctx.drawImage(skin2, -skin2X, skinY, skinWidth, skinHeight);
        ctx.restore();

        // Função atualizada para desenhar nome e nível centralizados sobre a skin
        function drawPlayerInfo(name, level, skinX, align) {
            ctx.save();
            
            // Calcular posição X central da skin
            const centerX = align === 'left' ? 
                skinX + (skinWidth / 2) : // Para player 1
                skinX - (skinWidth / 2);  // Para player 2

            // Nome do jogador
            ctx.font = 'bold 40px Minecraft';
            ctx.textAlign = 'center'; // Sempre centralizado
            ctx.fillStyle = '#ffffff';
            ctx.fillText(name, centerX, 110);

            // Nível do jogador
            ctx.font = 'bold 32px Minecraft';
            ctx.fillStyle = '#ffaa00';
            const levelText = `NÍVEL ${level}`;
            ctx.fillText(levelText, centerX, 145);
            
            ctx.restore();
        }

        // Desenhar informações dos jogadores com as novas posições
        drawPlayerInfo(player1, stats1.level || 0, skin1X, 'left');
        drawPlayerInfo(player2, stats2.level || 0, skin2X, 'right');

        // Estatísticas (removendo nível pois já está no topo)
        metrics.forEach(([label, getValue], i) => {
            if (typeof getValue !== 'function') return; // Ignorar itens inválidos
            const y = 220 + (i * 55); // Ajustado para 220 para ficar na altura da cabeça
            ctx.font = 'bold 26px Minecraft';
            
            // Labels
            ctx.fillStyle = '#808080';
            ctx.textAlign = 'left';
            ctx.fillText(label, 300, y);
            ctx.textAlign = 'right';
            ctx.fillText(label, 900, y);

            // Valores
            const value1 = getValue(stats1);
            const value2 = getValue(stats2);
            const value1Text = typeof value1 === 'number' ? value1.toLocaleString() : value1;
            const value2Text = typeof value2 === 'number' ? value2.toLocaleString() : value2;

            ctx.font = 'bold 26px Minecraft';
            
            // Valor jogador 1
            ctx.textAlign = 'left';
            ctx.fillStyle = value1 >= value2 ? '#00ff00' : '#ff3333';
            ctx.fillText(value1Text, 300, y + 30);

            // Valor jogador 2
            ctx.textAlign = 'right';
            ctx.fillStyle = value2 >= value1 ? '#00ff00' : '#ff3333';
            ctx.fillText(value2Text, 900, y + 30);
        });

        // Adicionar título do modo de jogo
        ctx.save();
        ctx.font = 'bold 36px Minecraft';
        ctx.textAlign = 'center';
        ctx.fillStyle = '#ffffff';
        ctx.fillText(gameTitle, canvas.width/2, 50);
        ctx.restore();

        return new AttachmentBuilder(canvas.toBuffer(), { name: 'comparison.png' });
    } catch (error) {
        console.error('Erro ao criar imagem:', error);
        throw error;
    }
}

// Função para calcular pontuação total
function calculateScore(stats) {
    return (
        (stats.wins || 0) * 10 +
        (stats.final_kills || 0) * 5 +
        (stats.level || 0) * 20 +
        (stats.max_winstreak || 0) * 15 +
        ((stats.wins || 0)/(stats.losses || 1)) * 30 +
        ((stats.final_kills || 0)/(stats.final_deaths || 1)) * 25
    );
}

// Função auxiliar para desenhar retângulos arredondados
function roundRect(ctx, x, y, width, height, radius) {
    ctx.beginPath();
    ctx.moveTo(x + radius, y);
    ctx.arcTo(x + width, y, x + width, y + height, radius);
    ctx.arcTo(x + width, y + height, x, y + height, radius);
    ctx.arcTo(x, y + height, x, y, radius);
    ctx.arcTo(x, y, x + width, y, radius);
    ctx.closePath();
    ctx.fill();
}

const GAME_CONFIGS = {

      
    // Bedwars Geral
    'bedwars_geral': {
        title: '🛏️ BEDWARS GERAL',
        getStats: (stats) => ({
            level: stats?.bedwars?.level || 0,
            wins: stats?.bedwars?.wins || 0,
            final_kills: stats?.bedwars?.final_kills || 0,
            beds_broken: stats?.bedwars?.beds_broken || 0,
            max_winstreak: stats?.bedwars?.max_winstreak || 0,
            losses: stats?.bedwars?.losses || 1,
            final_deaths: stats?.bedwars?.final_deaths || 1
        })
    },


    // Bedwars Solo
    'bedwars_solo': {
        title: '🛏️ BEDWARS SOLO',
        getStats: (stats) => ({
            level: stats?.bedwars?.level || 0,
            wins: stats?.bedwars?.solo_wins || 0,
            final_kills: stats?.bedwars?.solo_final_kills || 0,
            beds_broken: stats?.bedwars?.solo_beds_broken || 0,
            max_winstreak: stats?.bedwars?.solo_max_winstreak || 0,
            losses: stats?.bedwars?.solo_losses || 1,
            final_deaths: stats?.bedwars?.solo_final_deaths || 1
        })
    },

    // Bedwars Duplas
    'bedwars_doubles': {
        title: '🛏️ BEDWARS DUPLAS',
        getStats: (stats) => ({
            level: stats?.bedwars?.level || 0,
            wins: stats?.bedwars?.doubles_wins || 0,
            final_kills: stats?.bedwars?.doubles_final_kills || 0,
            beds_broken: stats?.bedwars?.doubles_beds_broken || 0,
            max_winstreak: stats?.bedwars?.doubles_max_winstreak || 0,
            losses: stats?.bedwars?.doubles_losses || 1,
            final_deaths: stats?.bedwars?.doubles_final_deaths || 1
        })
    },

    // Bedwars Trio (3v3v3v3)
    'bedwars_3v3v3v3': {
        title: '🛏️ BEDWARS TRIO',
        getStats: (stats) => ({
            level: stats?.bedwars?.level || 0,
            wins: stats?.bedwars?.['3v3v3v3_wins'] || 0,
            final_kills: stats?.bedwars?.['3v3v3v3_final_kills'] || 0,
            beds_broken: stats?.bedwars?.['3v3v3v3_beds_broken'] || 0,
            max_winstreak: stats?.bedwars?.['3v3v3v3_max_winstreak'] || 0,
            losses: stats?.bedwars?.['3v3v3v3_losses'] || 1,
            final_deaths: stats?.bedwars?.['3v3v3v3_final_deaths'] || 1
        })
    },

    // Bedwars Quarteto (4v4v4v4)
    'bedwars_4v4v4v4': {
        title: '🛏️ BEDWARS QUARTETO',
        getStats: (stats) => ({
            level: stats?.bedwars?.level || 0,
            wins: stats?.bedwars?.['4v4v4v4_wins'] || 0,
            final_kills: stats?.bedwars?.['4v4v4v4_final_kills'] || 0,
            beds_broken: stats?.bedwars?.['4v4v4v4_beds_broken'] || 0,
            max_winstreak: stats?.bedwars?.['4v4v4v4_max_winstreak'] || 0,
            losses: stats?.bedwars?.['4v4v4v4_losses'] || 1,
            final_deaths: stats?.bedwars?.['4v4v4v4_final_deaths'] || 1
        })
    },

        // Skywars Geral
    'skywars_geral': {
        title: '⭐ SKYWARS GERAL',
        getStats: (stats) => ({
            level: stats?.skywars_r1?.level || 0,
            wins: stats?.skywars_r1?.wins || 0,
            kills: stats?.skywars_r1?.kills || 0,
            max_winstreak: stats?.skywars_r1?.max_winstreak || 0,
            losses: stats?.skywars_r1?.losses || 1,
            deaths: stats?.skywars_r1?.deaths || 1
        })
    },
    // Skywars Solo
    'skywars_solo': {
        title: '⭐ SKYWARS SOLO',
        getStats: (stats) => ({
            level: stats?.skywars_r1?.level || 0,
            wins: stats?.skywars_r1?.wins_solo || 0,
            kills: stats?.skywars_r1?.kills_solo || 0,
            max_winstreak: stats?.skywars_r1?.max_winstreak_solo || 0,
            losses: stats?.skywars_r1?.losses_solo || 1,
            deaths: stats?.skywars_r1?.deaths_solo || 1
        })
    },

    // Skywars Duplas
    'skywars_2v2': {
        title: '⭐ SKYWARS DUPLAS',
        getStats: (stats) => ({
            level: stats?.skywars_r1?.level || 0,
            wins: stats?.skywars_r1?.wins_2v2 || 0,
            kills: stats?.skywars_r1?.kills_2v2 || 0,
            max_winstreak: stats?.skywars_r1?.max_winstreak_2v2 || 0,
            losses: stats?.skywars_r1?.losses_2v2 || 1,
            deaths: stats?.skywars_r1?.deaths_2v2 || 1
        })
    },

    // UHC Duels
    'uhc': {
        title: '⚔️ DUELS UHC',
        getStats: (stats) => ({
            level: stats?.duels?.uhc_level || 0,
            wins: stats?.duels?.uhc_wins || 0,
            kills: stats?.duels?.uhc_kills || 0,
            max_winstreak: stats?.duels?.uhc_max_winstreak || 0,
            losses: stats?.duels?.uhc_losses || 1,
            deaths: stats?.duels?.uhc_deaths || 1
        })
    },

    // Sumo Duels
    'sumo': {
        title: '⚔️ DUELS SUMO',
        getStats: (stats) => ({
            level: stats?.duels?.sumo_level || 0,
            wins: stats?.duels?.sumo_wins || 0,
            kills: stats?.duels?.sumo_kills || 0,
            max_winstreak: stats?.duels?.sumo_max_winstreak || 0,
            losses: stats?.duels?.sumo_losses || 1,
            deaths: stats?.duels?.sumo_deaths || 1
        })
    },

    // Soup Duels
    'soup': {
        title: '⚔️ DUELS SOUP',
        getStats: (stats) => ({
            level: stats?.duels?.soup_level || 0,
            wins: stats?.duels?.soup_wins || 0,
            kills: stats?.duels?.soup_kills || 0,
            max_winstreak: stats?.duels?.soup_max_winstreak || 0,
            losses: stats?.duels?.soup_losses || 1,
            deaths: stats?.duels?.soup_deaths || 1
        })
    },

    // NoDebuff Duels
    'no_debuff': {
        title: '⚔️ DUELS NODEBUFF',
        getStats: (stats) => ({
            level: stats?.duels?.no_debuff_level || 0,
            wins: stats?.duels?.no_debuff_wins || 0,
            kills: stats?.duels?.no_debuff_kills || 0,
            max_winstreak: stats?.duels?.no_debuff_max_winstreak || 0,
            losses: stats?.duels?.no_debuff_losses || 1,
            deaths: stats?.duels?.no_debuff_deaths || 1
        })
    },

    // Combo Duels
    'combo': {
        title: '⚔️ DUELS COMBO',
        getStats: (stats) => ({
            level: stats?.duels?.combo_level || 0,
            wins: stats?.duels?.combo_wins || 0,
            kills: stats?.duels?.combo_kills || 0,
            max_winstreak: stats?.duels?.combo_max_winstreak || 0,
            losses: stats?.duels?.combo_losses || 1,
            deaths: stats?.duels?.combo_deaths || 1
        })
    },

    // Boxing Duels
    'boxing': {
        title: '⚔️ DUELS BOXING',
        getStats: (stats) => ({
            level: stats?.duels?.boxing_level || 0,
            wins: stats?.duels?.boxing_wins || 0,
            kills: stats?.duels?.boxing_kills || 0,
            max_winstreak: stats?.duels?.boxing_max_winstreak || 0,
            losses: stats?.duels?.boxing_losses || 1,
            deaths: stats?.duels?.boxing_deaths || 1
        })
    },

    // Bed Fight Solo
    'bed_fight_solo': {
        title: '⚔️ DUELS BEDFIGHT SOLO',
        getStats: (stats) => ({
            level: stats?.duels?.bed_fight_solo_level || 0,
            wins: stats?.duels?.bed_fight_solo_wins || 0,
            kills: stats?.duels?.bed_fight_solo_kills || 0,
            max_winstreak: stats?.duels?.bed_fight_solo_max_winstreak || 0,
            losses: stats?.duels?.bed_fight_solo_losses || 1,
            deaths: stats?.duels?.bed_fight_solo_deaths || 1
        })
    },

    // Bed Fight Duplas
    'bed_fight_doubles': {
        title: '⚔️ DUELS BEDFIGHT DUPLAS',
        getStats: (stats) => ({
            level: stats?.duels?.bed_fight_doubles_level || 0,
            wins: stats?.duels?.bed_fight_doubles_wins || 0,
            kills: stats?.duels?.bed_fight_doubles_kills || 0,
            max_winstreak: stats?.duels?.bed_fight_doubles_max_winstreak || 0,
            losses: stats?.duels?.bed_fight_doubles_losses || 1,
            deaths: stats?.duels?.bed_fight_doubles_deaths || 1
        })
    },

    // Fireball Solo
    'fireball_fight_solo': {
        title: '⚔️ FIREBALLFIGHT SOLO',
        getStats: (stats) => ({
            level: stats?.duels?.fireball_fight_solo_level || 0,
            wins: stats?.duels?.fireball_fight_solo_wins || 0,
            kills: stats?.duels?.fireball_fight_solo_kills || 0,
            max_winstreak: stats?.duels?.fireball_fight_solo_max_winstreak || 0,
            losses: stats?.duels?.fireball_fight_solo_losses || 1,
            deaths: stats?.duels?.fireball_fight_solo_deaths || 1
        })
    },

    // Fireball Duplas
    'fireball_fight_doubles': {
        title: '⚔️ FIREBALLFIGHT DUPLAS',
        getStats: (stats) => ({
            level: stats?.duels?.fireball_fight_doubles_level || 0,
            wins: stats?.duels?.fireball_fight_doubles_wins || 0,
            kills: stats?.duels?.fireball_fight_doubles_kills || 0,
            max_winstreak: stats?.duels?.fireball_fight_doubles_max_winstreak || 0,
            losses: stats?.duels?.fireball_fight_doubles_losses || 1,
            deaths: stats?.duels?.fireball_fight_doubles_deaths || 1
        })
    }
};

// Atualizar getDefaultMetrics para incluir visualização geral
const getDefaultMetrics = (mode) => {
    if (mode.includes('bedwars')) {
        return [
            ['NÍVEL', (s) => s.level],
            ['VITÓRIAS', (s) => s.wins],
            ['ABATES FINAIS', (s) => s.final_kills],
            ['CAMAS QUEBRADAS', (s) => s.beds_broken],
            ['WINSTREAK', (s) => s.max_winstreak],
            ['WLR', (s) => ((s.wins || 0)/(s.losses || 1)).toFixed(2)],
            ['FKDR', (s) => ((s.final_kills || 0)/(s.final_deaths || 1)).toFixed(2)]
        ];
    } else {
        return [
            ['NÍVEL', (s) => s.level],
            ['VITÓRIAS', (s) => s.wins],
            ['ABATES', (s) => s.kills],
            ['WINSTREAK', (s) => s.max_winstreak],
            ['WLR', (s) => ((s.wins || 0)/(s.losses || 1)).toFixed(2)],
            ['KDR', (s) => ((s.kills || 0)/(s.deaths || 1)).toFixed(2)]
        ];
    }
};

module.exports = {
    data: new SlashCommandBuilder()
        .setName('comparar')
        .setDescription('Compara as estatísticas de dois jogadores')
        .addStringOption(option =>
            option.setName('player1')
                .setDescription('Primeiro jogador para comparar')
                .setRequired(true))
        .addStringOption(option =>
            option.setName('player2')
                .setDescription('Segundo jogador para comparar')
                .setRequired(true))
        .addStringOption(option =>
            option.setName('modo')
                .setDescription('Modo de jogo para comparar')
                .setRequired(true)
                .addChoices(
                    // Bedwars
                    { name: '🛏️ Bedwars', value: 'bedwars_geral' },
                    { name: '🛏️ Bedwars - Solo', value: 'bedwars_solo' },
                    { name: '🛏️ Bedwars - Duplas', value: 'bedwars_doubles' },
                    { name: '🛏️ Bedwars - Trio', value: 'bedwars_3v3v3v3' },
                    { name: '🛏️ Bedwars - Quarteto', value: 'bedwars_4v4v4v4' },
                    // Skywars
                    { name: '⭐ SkyWars', value: 'skywars_geral' },
                    { name: '⭐ SkyWars - Solo', value: 'skywars_solo' },
                    { name: '⭐ SkyWars - Duplas', value: 'skywars_2v2' },
                    // Duels
                    { name: '⚔️ Duels - UHC', value: 'uhc' },
                    { name: '⚔️ Duels - Sumo', value: 'sumo' },
                    { name: '⚔️ Duels - Boxing', value: 'boxing' },
                    { name: '⚔️ Duels - Sopa', value: 'soup' },
                    { name: '⚔️ Duels - NoDebuff', value: 'no_debuff' },
                    { name: '⚔️ Duels - Combo', value: 'combo' },
                    { name: '⚔️ Duels - Bed Fight Solo', value: 'bed_fight_solo' },
                    { name: '⚔️ Duels - Bed Fight Duplas', value: 'bed_fight_doubles' },
                    { name: '⚔️ Duels - Fireball Solo', value: 'fireball_fight_solo' },
                    { name: '⚔️ Duels - Fireball Duplas', value: 'fireball_fight_doubles' }
                )),

    async execute(interaction) {
        await interaction.deferReply();
        
        const player1 = interaction.options.getString('player1'); // Corrigido
        const player2 = interaction.options.getString('player2'); // Corrigido
        const gameMode = interaction.options.getString('modo');   // Corrigido

        // Mover getDefaultMetrics para o início do execute
        const getDefaultMetrics = (mode) => {
            if (mode === 'bedwars_geral') {
                return [
                    ['NÍVEL', (s) => s.level],
                    ['VITÓRIAS', (s) => s.wins],
                    ['ABATES FINAIS', (s) => s.final_kills],
                    ['CAMAS QUEBRADAS', (s) => s.beds_broken],
                    ['WINSTREAK', (s) => s.max_winstreak],
                    ['WLR', (s) => ((s.wins || 0)/(s.losses || 1)).toFixed(2)],
                    ['FKDR', (s) => ((s.final_kills || 0)/(s.final_deaths || 1)).toFixed(2)]
                ];
            }
            if (mode.startsWith('bedwars')) {
                return [
                    ['NÍVEL', (s) => s.level],
                    ['VITÓRIAS', (s) => s.wins],
                    ['ABATES FINAIS', (s) => s.final_kills],
                    ['CAMAS QUEBRADAS', (s) => s.beds_broken],
                    ['WINSTREAK', (s) => s.max_winstreak],
                    ['WLR', (s) => ((s.wins || 0)/(s.losses || 1)).toFixed(2)],
                    ['FKDR', (s) => ((s.final_kills || 0)/(s.final_deaths || 1)).toFixed(2)]
                ];
            } else {
                return [
                    ['NÍVEL', (s) => s.level],
                    ['VITÓRIAS', (s) => s.wins],
                    ['ABATES', (s) => s.kills],
                    ['WINSTREAK', (s) => s.max_winstreak],
                    ['WLR', (s) => ((s.wins || 0)/(s.losses || 1)).toFixed(2)],
                    ['KDR', (s) => ((s.kills || 0)/(s.deaths || 1)).toFixed(2)]
                ];
            }
        };

        try {
            const [response1, response2] = await Promise.all([
                axios.get(`${CONFIG.apiUrl}/${player1}`),
                axios.get(`${CONFIG.apiUrl}/${player2}`)
            ]);

            const gameConfig = GAME_CONFIGS[gameMode];
            if (!gameConfig) {
                return interaction.editReply('❌ Modo de jogo não encontrado!');
            }

            const stats1 = gameConfig.getStats(response1.data?.response?.stats);
            const stats2 = gameConfig.getStats(response2.data?.response?.stats);

            // Garantir que todas as propriedades existam
            const metrics = getDefaultMetrics(gameMode);

            const comparison = await createComparisonImage(
                player1,
                player2,
                stats1,
                stats2,
                gameConfig.title,
                metrics  // Passando as métricas corretas
            );

            await interaction.editReply({ files: [comparison] });
        } catch (error) {
            console.error('Erro detalhado:', error);
            await interaction.editReply('❌ Erro ao buscar dados dos jogadores.');
        }
    },
};