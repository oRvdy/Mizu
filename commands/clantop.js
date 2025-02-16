const { SlashCommandBuilder, AttachmentBuilder } = require('discord.js');
const { createCanvas, loadImage, registerFont } = require('canvas');
const path = require('path');
const fs = require('fs').promises;
const axios = require('axios');

// Registrar fontes
registerFont(path.join(__dirname, '..', 'assets', 'Minecraft.ttf'), { family: 'Minecraft' });
registerFont(path.join(__dirname, '..', 'assets', 'MinecraftBold.ttf'), { family: 'Minecraft Bold' });

// Cache do ranking
let rankingCache = {
    data: null,
    lastUpdate: 0
};

const CACHE_DURATION = 5 * 60 * 1000; // 5 minutos em millisegundos
const PROGRESS_STEPS = 5; // Número de etapas para mostrar progresso

module.exports = {
    data: new SlashCommandBuilder()
        .setName('clantop')
        .setDescription('[Mizu] Mostra o ranking dos clans'),

    async execute(interaction) {
        const now = Date.now();

        // Verificar se pode usar cache
        if (rankingCache.data && (now - rankingCache.lastUpdate) < CACHE_DURATION) {
            const attachment = await generateTopImage(rankingCache.data);
            return await interaction.reply({ files: [attachment] });
        }

        const progressMessage = await interaction.reply({
            embeds: [{
                description: '<a:Relogio:1331082692930044006> **Atualizando ranking dos clans...**\n> Fase 1/5: Carregando dados...',
                color: 0x2f3136
            }],
            fetchReply: true
        });

        try {
            const clans = await loadClansData();
            
            await progressMessage.edit({
                embeds: [{
                    description: '<a:Relogio:1331082692930044006> **Atualizando ranking dos clans...**\n> Fase 2/5: Processando estatísticas...',
                    color: 0x2f3136
                }]
            });

            const rankedClans = await calculateClanRankingsOptimized(clans, progressMessage);
            
            // Atualizar cache
            rankingCache.data = rankedClans;
            rankingCache.lastUpdate = now;

            await progressMessage.edit({
                embeds: [{
                    description: '<a:Relogio:1331082692930044006> **Atualizando ranking dos clans...**\n> Fase 5/5: Gerando imagem...',
                    color: 0x2f3136
                }]
            });

            const attachment = await generateTopImage(rankedClans);
            await progressMessage.edit({ embeds: [], files: [attachment] });

        } catch (error) {
            console.error('Erro ao gerar ranking dos clans:', error);
            await progressMessage.edit({
                embeds: [{
                    description: '❌ **Erro ao gerar o ranking dos clans**\n> Tente novamente mais tarde.',
                    color: 0xff0000
                }]
            });
        }
    }
};

async function loadClansData() {
    const filePath = path.join(__dirname, '..', 'data', 'clans.json');
    const data = JSON.parse(await fs.readFile(filePath, 'utf8'));
    return data;
}

async function calculateClanRankingsOptimized(clans, progressMessage) {
    const clanStats = [];
    const clanEntries = Object.entries(clans);
    const batchSize = 5; // Número de requisições simultâneas

    for (let i = 0; i < clanEntries.length; i += batchSize) {
        const batch = clanEntries.slice(i, i + batchSize);
        const progress = Math.floor((i / clanEntries.length) * 100);

        await progressMessage.edit({
            embeds: [{
                description: `<a:Relogio:1331082692930044006> **Atualizando ranking dos clans...**\n> Fase 3/5: Processando clans... (${progress}%)`,
                color: 0x2f3136
            }]
        });

        const batchPromises = batch.map(async ([tag, clanData]) => {
            const memberPromises = clanData.members.map(member =>
                axios.get(`https://mush.com.br/api/player/${member}`)
                    .catch(() => ({ data: { response: null } }))
            );

            const memberResponses = await Promise.all(memberPromises);
            const stats = memberResponses.reduce((acc, response) => {
                const playerData = response.data?.response?.stats?.bedwars;
                if (playerData) {
                    acc.wins += playerData.wins || 0;
                    acc.kills += playerData.final_kills || 0;
                    acc.xp += playerData.xp || 0;
                }
                return acc;
            }, { wins: 0, kills: 0, xp: 0 });

            return {
                tag,
                name: clanData.clan?.name || tag,
                color: clanData.clan?.tag_color || '#ffffff',
                members: clanData.members.length,
                stats
            };
        });

        const batchResults = await Promise.all(batchPromises);
        clanStats.push(...batchResults);
    }

    return clanStats.sort((a, b) => b.stats.xp - a.stats.xp).slice(0, 10);
}

async function generateTopImage(rankedClans) {
    const canvas = createCanvas(1000, 800);
    const ctx = canvas.getContext('2d');

    try {
        // Background e overlay
        const background = await loadImage(path.join(__dirname, '..', 'assets', 'clan_bg.png'));
        ctx.drawImage(background, 0, 0, canvas.width, canvas.height);
        
        // Gradiente overlay mais suave
        const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
        gradient.addColorStop(0, 'rgba(0, 0, 0, 0.85)');
        gradient.addColorStop(0.5, 'rgba(0, 0, 0, 0.75)');
        gradient.addColorStop(1, 'rgba(0, 0, 0, 0.9)');
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // Título com borda elegante
        const titleY = 80;
        ctx.save();
        // Borda do título
        ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
        roundRect(ctx, canvas.width/2 - 200, titleY - 50, 400, 70, 15);
        ctx.fill();
        ctx.restore();

        // Título com sombra
        ctx.font = 'bold 48px Minecraft';
        ctx.textAlign = 'center';
        ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
        ctx.fillText('TOP 10 CLANS', canvas.width / 2 + 2, titleY + 2);
        ctx.fillStyle = '#ffd700';
        ctx.fillText('TOP 10 CLANS', canvas.width / 2, titleY);

        // Cabeçalho com design moderno
        const headers = ['POS', 'CLAN', 'MEMBROS', 'WINS', 'KILLS', 'XP'];
        const colWidths = [80, 300, 150, 150, 150, 150];
        const startY = 150;
        const rowHeight = 65;

        // Desenhar cabeçalhos com estilo
        ctx.font = 'bold 24px Minecraft';
        let currentX = 20;
        headers.forEach((header, i) => {
            ctx.fillStyle = '#ffaa00';
            ctx.textAlign = i === 1 ? 'left' : 'center';
            const x = i === 1 ? currentX : currentX + colWidths[i] / 2;
            ctx.fillText(header, x, startY);
            currentX += colWidths[i];
        });

        // Linha separadora elegante
        ctx.strokeStyle = 'rgba(255, 170, 0, 0.3)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(10, startY + 10);
        ctx.lineTo(canvas.width - 10, startY + 10);
        ctx.stroke();

        // Desenhar clans com efeitos visuais
        rankedClans.forEach((clan, index) => {
            const y = startY + ((index + 1) * rowHeight);
            
            // Box de fundo para cada linha com gradiente
            const boxGradient = ctx.createLinearGradient(10, y - 30, 10, y + 10);
            boxGradient.addColorStop(0, 'rgba(255, 255, 255, 0.03)');
            boxGradient.addColorStop(1, 'rgba(255, 255, 255, 0.07)');
            ctx.fillStyle = boxGradient;
            roundRect(ctx, 10, y - 30, canvas.width - 20, 50, 8);
            ctx.fill();

            currentX = 20;
            
            // Posição com efeito especial para top 3
            ctx.font = 'bold 28px Minecraft';
            if (index < 3) {
                // Círculo de fundo para top 3
                ctx.save();
                ctx.fillStyle = `rgba(${index === 0 ? '255, 215, 0' : index === 1 ? '192, 192, 192' : '205, 127, 50'}, 0.2)`;
                ctx.beginPath();
                ctx.arc(currentX + colWidths[0] / 2, y - 5, 25, 0, Math.PI * 2);
                ctx.fill();
                ctx.restore();
            }
            
            ctx.fillStyle = getPositionColor(index);
            ctx.textAlign = 'center';
            ctx.fillText(`#${index + 1}`, currentX + colWidths[0] / 2, y);
            currentX += colWidths[0];

            // Nome do Clan com sua cor e brilho
            ctx.fillStyle = clan.color;
            ctx.textAlign = 'left';
            ctx.font = 'bold 26px Minecraft';
            ctx.fillText(clan.tag, currentX, y);
            currentX += colWidths[1];

            // Stats com formatação melhorada
            ctx.font = '24px Minecraft';
            ctx.fillStyle = '#ffffff';
            ctx.textAlign = 'center';
            [clan.members, 
             formatNumber(clan.stats.wins), 
             formatNumber(clan.stats.kills), 
             formatNumber(clan.stats.xp)
            ].forEach((value, i) => {
                ctx.fillText(value, currentX + colWidths[i + 2] / 2, y);
                currentX += colWidths[i + 2];
            });
        });

        // Copyright elegante
        ctx.font = '16px Minecraft';
        ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
        ctx.textAlign = 'right';
        ctx.fillText('© 2024 Rezando', canvas.width - 20, canvas.height - 20);

    } catch (error) {
        console.error('Erro ao gerar imagem do ranking:', error);
        ctx.fillStyle = '#000000';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
    }

    return new AttachmentBuilder(canvas.toBuffer(), { name: 'clan-ranking.png' });
}

function getPositionColor(position) {
    switch (position) {
        case 0: return '#ffd700'; // Ouro
        case 1: return '#c0c0c0'; // Prata
        case 2: return '#cd7f32'; // Bronze
        default: return '#ffffff';
    }
}

function formatNumber(num) {
    if (num >= 1000000) {
        return (num / 1000000).toFixed(1) + 'M';
    }
    if (num >= 1000) {
        return (num / 1000).toFixed(1) + 'K';
    }
    return num.toString();
}

function roundRect(ctx, x, y, width, height, radius) {
    if (width < 2 * radius) radius = width / 2;
    if (height < 2 * radius) radius = height / 2;
    ctx.beginPath();
    ctx.moveTo(x + radius, y);
    ctx.arcTo(x + width, y, x + width, y + height, radius);
    ctx.arcTo(x + width, y + height, x, y + height, radius);
    ctx.arcTo(x, y + height, x, y, radius);
    ctx.arcTo(x, y, x + width, y, radius);
    ctx.closePath();
}
