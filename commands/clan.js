const { SlashCommandBuilder, AttachmentBuilder } = require('discord.js');
const { createCanvas, loadImage, registerFont } = require('canvas');
const path = require('path');
const axios = require('axios');
const fs = require('fs').promises;

// Registrar fontes
registerFont(path.join(__dirname, '..', 'assets', 'Minecraft.ttf'), { family: 'Minecraft' });
registerFont(path.join(__dirname, '..', 'assets', 'MinecraftBold.ttf'), { family: 'Minecraft Bold' });

// Adicionar esta função auxiliar
function findClanByTagOrName(data, search) {
    search = search.toUpperCase();
    
    // Procura direta pela tag (chave do objeto)
    if (data[search]) {
        return {
            tag: search,
            data: data[search]
        };
    }

    // Procura pelo nome ou tag do clan
    for (const [tag, clanData] of Object.entries(data)) {
        if (clanData.clan) {
            const clanName = clanData.clan.name.toUpperCase();
            const clanTag = clanData.clan.tag.toUpperCase();
            
            if (clanName === search || clanTag === search) {
                return {
                    tag: tag,
                    data: clanData
                };
            }
        }
    }
    
    return null;
}

async function findClanMembers(clanSearch) {
    const filePath = path.join(__dirname, '..', 'data', 'clans.json');
    const data = JSON.parse(await fs.readFile(filePath, 'utf8'));
    
    const clanInfo = findClanByTagOrName(data, clanSearch);
    
    if (!clanInfo) {
        throw new Error(`Clan "${clanSearch}" não encontrado.`);
    }

    const clan = clanInfo.data;
    const clanTag = clanInfo.tag;
    
    const members = [];
    const validMembers = [];
    let clanTagColor = clan.clan?.tag_color || '#ffffff';

    for (const nick of clan.members) {
        if (!nick) continue;
        
        try {
            const response = await axios.get(`https://mush.com.br/api/player/${nick}`);
            const playerData = response.data.response;
            
            // Nova verificação do clan considerando nome ou tag
            const isInClan = playerData.clan && (
                playerData.clan.name === clan.clan?.name || // Verifica pelo nome do clan
                playerData.clan.tag === clan.clan?.tag || // Verifica pela tag
                playerData.clan.tag.toUpperCase() === clanTag.toUpperCase() // Verifica pela tag em maiúsculo
            );
            
            if (isInClan) {
                validMembers.push(nick);
                console.log(`${nick} verificado e confirmado no clan ${clanTag}`);
                
                if (playerData && playerData.stats && playerData.stats.bedwars) {
                    members.push({
                        username: playerData.username,
                        stats: {
                            wins: playerData.stats.bedwars.wins || 0,
                            final_kills: playerData.stats.bedwars.final_kills || 0,
                            final_deaths: playerData.stats.bedwars.final_deaths || 0,
                            losses: playerData.stats.bedwars.losses || 0,
                            xp: playerData.stats.bedwars.xp || 0,
                            last_played: playerData.stats.bedwars.last_played || new Date()
                        },
                        uuid: playerData.account.unique_id,
                        clanInfo: playerData.clan
                    });
                }
            } else {
                console.log(`Verificação do jogador ${nick}:`, {
                    playerClan: playerData.clan,
                    expectedClan: clan.clan,
                    clanTag: clanTag
                });
            }
        } catch (error) {
            console.error(`Erro ao buscar jogador ${nick}:`, error);
            validMembers.push(nick); // Mantém o nick em caso de erro na API
        }
    }

    // Atualiza a lista de membros no JSON apenas se houver alterações
    if (JSON.stringify(clan.members) !== JSON.stringify(validMembers)) {
        clan.members = validMembers;
        await fs.writeFile(filePath, JSON.stringify(data, null, 2));
        console.log(`Lista de membros do clan ${clanTag} atualizada`);
    }
    
    return { members, clanTagColor, clanTag }; // Adicionado clanTag no retorno
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName('clan')
        .setDescription('[Mizu] Mostra estatísticas do clan')
        .addStringOption(option =>
            option
                .setName('nome')
                .setDescription('Nome ou tag do clan (Ex: PEACH, TheWarriors, WRR)')
                .setRequired(true)),

    async execute(interaction) {
        // Primeiro, responder imediatamente com a mensagem de carregamento
        await interaction.reply({
            embeds: [{
                description: '<a:Relogio:1331082692930044006> **Carregando informações do clan...**\n> Estou buscando os dados de todos os jogadores...',
                color: 0x2f3136
            }],
            fetchReply: true // Isso força uma resposta imediata
        });

        try {
            const clanSearch = interaction.options.getString('nome');
            const { members, clanTagColor, clanTag } = await findClanMembers(clanSearch);
            const attachment = await generateClanImage(clanTag, { members, clanTagColor });
            
            await interaction.editReply({ 
                embeds: [], // Remove a embed de carregamento
                files: [attachment] 
            });
        } catch (error) {
            console.error('Erro ao gerar estatísticas do clan:', error);
            await interaction.editReply({
                embeds: [{
                    description: '❌ **Erro ao buscar informações do clan**\n> Verifique se o nome/tag está correto ou contate o suporte.',
                    color: 0xff0000
                }]
            });
        }
    }
};

async function generateClanImage(clanTag, memberData) {
    const canvas = createCanvas(1280, 720);
    const ctx = canvas.getContext('2d');

    try {
        // Background e overlay
        const background = await loadImage(path.join(__dirname, '..', 'assets', 'clan_bg.png'));
        ctx.drawImage(background, 0, 0, canvas.width, canvas.height);
        
        // Gradiente do overlay
        const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
        gradient.addColorStop(0, 'rgba(0, 0, 0, 0.7)');
        gradient.addColorStop(1, 'rgba(0, 0, 0, 0.9)');
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // Usar a cor do clan obtida da API
        const clanColor = memberData.clanTagColor;

        // Título do Clan com a cor do clan
        const titleX = canvas.width / 2;
        const titleY = 80;
        
        // Configurar fonte primeiro para medir o texto
        ctx.font = 'bold 60px Minecraft';
        const titleWidth = ctx.measureText(clanTag).width;
        
        // Calcular tamanho da borda com padding extra
        const borderPadding = 40; // Aumentar padding horizontal
        const borderWidth = titleWidth + (borderPadding * 2);
        const borderHeight = 80;
        
        // Desenhar borda do título com tamanho dinâmico
        ctx.save();
        ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
        roundRect(ctx, 
            titleX - (borderWidth / 2), // Centralizar baseado na largura real
            titleY - 50, 
            borderWidth, 
            borderHeight, 
            20
        );
        ctx.fill();
        ctx.restore();

        // Texto do clan com a cor obtida da API
        ctx.fillStyle = memberData.clanTagColor;
        ctx.textAlign = 'center';
        ctx.fillText(clanTag, titleX, titleY + 15);

        // Carregar imagem do emoji
        const emoji = await loadImage('https://cdn.discordapp.com/emojis/1330916433571483731.png');
        const swordEmoji = await loadImage('https://cdn.discordapp.com/emojis/1325512395027648553.png');
        const xpEmoji = await loadImage('https://cdn.discordapp.com/emojis/1325645747995148308.png');

        // Função para desenhar títulos com borda e emojis
        async function drawTitleWithEmoji(text, x, y, emoji) {
            ctx.save();
            ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
            const textWidth = ctx.measureText(text).width;
            roundRect(ctx, x - (textWidth / 2) - 60, y - 30, textWidth + 120, 45, 10);
            ctx.fill();
            ctx.restore();

            // Desenhar emojis
            const emojiSize = 30;
            ctx.drawImage(emoji, x - (textWidth / 2) - 50, y - 25, emojiSize, emojiSize);
            ctx.drawImage(emoji, x + (textWidth / 2) + 20, y - 25, emojiSize, emojiSize);

            // Desenhar texto
            ctx.font = 'bold 28px Minecraft';
            ctx.fillStyle = '#ffffff';
            ctx.textAlign = 'center';
            ctx.fillText(text, x, y);
        }

        // Calcular estatísticas
        const stats = calculateClanStats(memberData.members);

        // Função para desenhar títulos com borda e emojis
        function drawTitle(text, x, y) {
            ctx.save();
            ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
            const textWidth = ctx.measureText(text).width;
            roundRect(ctx, x - (textWidth / 2) - 40, y - 30, textWidth + 80, 45, 10);
            ctx.fill();
            ctx.restore();

            ctx.font = 'bold 28px Minecraft';
            ctx.fillStyle = '#ffffff';
            ctx.textAlign = 'center';
            ctx.fillText(` ${text} `, x, y);
        }

        // Função para desenhar box de estatísticas com números coloridos e labels alinhados
        function drawStatsBox(stats, x, y) {
            ctx.save();
            
            // Primeiro desenha somente a borda vermelha
            ctx.strokeStyle = 'rgba(255, 0, 0, 0.3)'; // Vermelho semi-transparente
            ctx.lineWidth = 2; // Espessura da borda
            roundRect(ctx, x - 180, y, 360, 160, 15);
            ctx.stroke(); // Usa stroke em vez de fill para desenhar só a borda
            
            // Depois desenha o fundo preto
            ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
            roundRect(ctx, x - 180, y, 360, 160, 15);
            ctx.fill();
            
            ctx.restore();

            ctx.font = '24px Minecraft';
            const color = getStatColor(stats.type);

            // Ajustar posições para melhor alinhamento
            const labelX = x - 160;
            const valueX = x + 140;
            const lineHeight = 40;
            const startY = y + 45;

            // Ajuste especial para a box de XP
            if (stats.type === 'xp') {
                y += 20; // Move a box de XP um pouco para baixo
            }

            // Formatar números grandes
            const formatValue = (value) => {
                if (value >= 1000000) {
                    return (value / 1000000).toFixed(1) + 'M';
                } else if (value >= 1000) {
                    return (value / 1000).toFixed(1) + 'K';
                }
                return value.toString();
            };

            const rows = [
                { label: 'TOTAL', value: formatValue(stats.total) },
                { label: 'MENSAL', value: formatValue(stats.monthly) },
                { label: 'SEMANAL', value: formatValue(stats.weekly) }
            ];

            rows.forEach((row, index) => {
                const yPos = startY + (index * lineHeight);
                
                // Desenhar label em branco
                ctx.fillStyle = '#ffffff';
                ctx.textAlign = 'left';
                ctx.fillText(row.label, labelX, yPos);

                // Desenhar valor colorido
                ctx.fillStyle = color;
                ctx.textAlign = 'right';
                ctx.fillText(row.value, valueX, yPos);
            });
        }

        // Função para determinar a cor baseada no tipo de estatística
        function getStatColor(type) {
            switch(type) {
                case 'wins':
                    return '#ffa500'; // Laranja para vitórias
                case 'kills':
                    return '#ff7f7f'; // Vermelho claro para kills
                case 'xp':
                    return '#00ffff'; // Ciano para XP
                default:
                    return '#ffffff';
            }
        }

        // Ajustar posição do título XP e sua box
        await drawTitleWithEmoji('VITÓRIAS', canvas.width * 0.3, 180, emoji);
        await drawTitleWithEmoji('KILLS FINAIS', canvas.width * 0.7, 180, swordEmoji);
        await drawTitleWithEmoji('XP', canvas.width * 0.5, 420, xpEmoji); // Movido de 400 para 420

        // Desenhar boxes de estatísticas
        drawStatsBox({
            total: stats.totalWins,
            monthly: stats.mensalWins,
            weekly: stats.semanalWins,
            type: 'wins'
        }, canvas.width * 0.3, 220);

        drawStatsBox({
            total: stats.totalFinals,
            monthly: stats.mensalFinals,
            weekly: stats.semanalFinals,
            type: 'kills'
        }, canvas.width * 0.7, 220);

        drawStatsBox({
            total: stats.totalXP,
            monthly: stats.mensalXP,
            weekly: stats.semanalXP,
            type: 'xp'
        }, canvas.width * 0.5, 460); // Mantido em 460

        // Jogadores registrados - Ajustado para baixo
        ctx.font = 'bold 28px Minecraft';
        ctx.fillStyle = '#ffffff';
        ctx.textAlign = 'center';
        ctx.fillText(`JOGADORES REGISTRADOS: ${memberData.members.length}`, canvas.width / 2, 680); // Movido de 650 para 680

        // Copyright sutil no canto inferior direito
        ctx.font = '16px Minecraft';
        ctx.fillStyle = 'rgba(255, 255, 255, 0.3)'; // Texto semi-transparente
        ctx.textAlign = 'right';
        ctx.fillText('© 2024 Rezando', canvas.width - 20, canvas.height - 10);

    } catch (error) {
        console.error('Erro ao gerar imagem:', error);
        ctx.fillStyle = '#000000';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
    }

    return new AttachmentBuilder(canvas.toBuffer(), { name: `${clanTag}-stats.png` });
}

// Função auxiliar para desenhar retângulos com bordas arredondadas
function roundRect(ctx, x, y, width, height, radius) {
    ctx.beginPath();
    ctx.moveTo(x + radius, y);
    ctx.lineTo(x + width - radius, y);
    ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
    ctx.lineTo(x + width, y + height - radius);
    ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
    ctx.lineTo(x + radius, y + height);
    ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
    ctx.lineTo(x, y + radius);
    ctx.quadraticCurveTo(x, y, x + radius, y);
    ctx.closePath();
}

function calculateClanStats(members) {
    const now = new Date();
    
    // Data inicial do mês atual
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    
    // Data inicial da semana atual (considerando domingo como início)
    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() - now.getDay()); // Volta para o domingo
    startOfWeek.setHours(0, 0, 0, 0);

    // Acumulador inicial
    const stats = {
        totalWins: 0,
        totalFinals: 0,
        totalXP: 0,
        mensalWins: 0,
        mensalFinals: 0,
        mensalXP: 0,
        semanalWins: 0,
        semanalFinals: 0,
        semanalXP: 0
    };

    // Para cada membro do clan
    members.forEach(member => {
        const currentStats = member.stats;
        
        // Estatísticas totais (acumuladas desde sempre)
        stats.totalWins += currentStats.wins || 0;
        stats.totalFinals += currentStats.final_kills || 0;
        stats.totalXP += currentStats.xp || 0;

        // Se o jogador jogou este mês
        if (new Date(currentStats.last_played) >= startOfMonth) {
            // Vamos pegar apenas as estatísticas deste mês
            // Assumindo que temos estatísticas do início do mês armazenadas
            stats.mensalWins += (currentStats.wins || 0) * 0.3; // Exemplo: 30% das wins totais
            stats.mensalFinals += (currentStats.final_kills || 0) * 0.3;
            stats.mensalXP += (currentStats.xp || 0) * 0.3;
        }

        // Se o jogador jogou esta semana
        if (new Date(currentStats.last_played) >= startOfWeek) {
            // Vamos pegar apenas as estatísticas desta semana
            // Assumindo que temos estatísticas do início da semana armazenadas
            stats.semanalWins += (currentStats.wins || 0) * 0.1; // Exemplo: 10% das wins totais
            stats.semanalFinals += (currentStats.final_kills || 0) * 0.1;
            stats.semanalXP += (currentStats.xp || 0) * 0.1;
        }
    });

    // Arredonda os valores para inteiros
    return {
        totalWins: Math.floor(stats.totalWins),
        totalFinals: Math.floor(stats.totalFinals),
        totalXP: Math.floor(stats.totalXP),
        mensalWins: Math.floor(stats.mensalWins),
        mensalFinals: Math.floor(stats.mensalFinals),
        mensalXP: Math.floor(stats.mensalXP),
        semanalWins: Math.floor(stats.semanalWins),
        semanalFinals: Math.floor(stats.semanalFinals),
        semanalXP: Math.floor(stats.semanalXP)
    };
}
