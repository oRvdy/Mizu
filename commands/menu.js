const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const path = require('path');
const fs = require('fs').promises;
const axios = require('../utils/axios'); // Usar a instância configurada

module.exports = {
    data: new SlashCommandBuilder()
        .setName('menu')
        .setDescription('Menu de configurações')
        .addSubcommand(subcommand =>
            subcommand
                .setName('vincular')
                .setDescription('Vincular sua conta do Mush')
                .addStringOption(option =>
                    option.setName('nick')
                        .setDescription('Seu nickname no Mush')
                        .setRequired(true)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('ver')
                .setDescription('Ver metas de um jogador')
                .addStringOption(option =>
                    option.setName('nick')
                        .setDescription('Nickname do jogador')
                        .setRequired(false))),

    async execute(interaction) {
        await interaction.deferReply();

        try {
            const subcommand = interaction.options.getSubcommand();
            switch (subcommand) {
                case 'vincular':
                    return this.handleVincular(interaction);
                case 'ver':
                    return this.handleMenu(interaction);
            }
        } catch (error) {
            console.error('Erro no comando menu:', error);
            await interaction.editReply('❌ Ocorreu um erro ao processar o comando.');
        }
    },

    async handleVincular(interaction) {
        try {
            const nickname = interaction.options.getString('nick');
            
            const verification = await interaction.client.players.linkPlayer(
                interaction.user.id,
                nickname
            );

            const embed = new EmbedBuilder()
                .setColor(verification.data.profile_tag?.color || '#00ff00') // Use profile tag color or default green
                .setTitle('✅ Conta Vinculada')
                .setDescription(`
                    > 📋 Nickname: **${verification.nickname}**
                    > 🏷️ Tipo: **${verification.data.account.type}**
                    ${verification.data.clan ? `> 🛡️ Clan: **${verification.data.clan.name}**` : ''}
                    > ⚡ Status: **Verificado**
                `)
                .setFooter({
                    text: 'Use /clan para gerenciar seu clan'
                });

            await interaction.editReply({ embeds: [embed] });
        } catch (error) {
            console.error('Erro ao vincular conta:', error);
            await interaction.editReply({
                content: `❌ Erro: ${error.message}`
            });
        }
    },

    async handleMenu(interaction) {
        try {
            const targetNick = interaction.options.getString('nick');
            const userId = interaction.user.id;
            const dataPath = path.join(__dirname, '..', 'data', 'metas');

            // Se um nickname foi especificado, procurar em todos os arquivos de meta
            if (targetNick) {
                const files = await fs.readdir(dataPath);
                let targetUserData = null;
                let targetUserId = null;

                // Procurar o nickname em todos os arquivos
                for (const file of files) {
                    if (!file.endsWith('.json')) continue;
                    
                    const userData = JSON.parse(await fs.readFile(path.join(dataPath, file), 'utf8'));
                    if (userData.nickname.toLowerCase() === targetNick.toLowerCase()) {
                        targetUserData = userData;
                        targetUserId = file.replace('.json', '');
                        break;
                    }
                }

                if (!targetUserData) {
                    return interaction.editReply(`❌ Nenhuma meta encontrada para o jogador \`${targetNick}\``);
                }

                // Fetch current stats from API
                const response = await axios.get(`https://mush.com.br/api/player/${targetUserData.nickname}`);
                const playerData = response.data.response;

                const embed = new EmbedBuilder()
                    .setTitle(`『<:xpzinho:1325645747995148308>』Metas de ${targetUserData.nickname}`)
                    .setColor(playerData.profile_tag?.color || '#2f3136')
                    .setThumbnail(`https://visage.surgeplay.com/bust/256/${playerData.account.unique_id}`)
                    .setDescription(`
                        ### <:stevedab:1325647842991411301> Status do Jogador
                        > <:Mush:1325298452812271676> Clan: \`${playerData.clan?.name || 'Nenhum'}\`
                        > <:Etiqueta:1324751489771638856> Tag: \`${playerData.rank_tag?.name || 'Nenhuma'}\`
                        > ⏰ Atualizado <t:${Math.floor(Date.now()/1000)}:R>
                    `)
                    .setFooter({ 
                        text: `${interaction.guild?.name || 'Server'} • Metas serão resetadas todo sábado às 23:59`,
                        iconURL: interaction.guild?.iconURL({ dynamic: true }) || null
                    });

                // Add game modes stats
                if (targetUserData.bedwars?.goals) {
                    const bedwarsStats = playerData.stats.bedwars;
                    embed.addFields({ 
                        name: '『<:bedzinha:1325646160697753731>』BEDWARS STATUS',
                        value: [
                            `> Level: ${bedwarsStats.level} `,
                            `> FKDR: ${(bedwarsStats.fkdr/100).toFixed(2)} `,
                            `> WS: ${bedwarsStats.winstreak} (Max: ${bedwarsStats.max_winstreak})`,
                            `> XP: ${bedwarsStats.xp.toLocaleString()}`
                        ].join('\n'),
                        inline: false 
                    });
                    embed.addFields(this.createProgressFields('Bedwars', targetUserData.bedwars, bedwarsStats));
                }

                // Adicionar informação sobre comandos do clan no embed
                embed.addFields({ 
                    name: '『🛡️』COMANDOS DO CLAN',
                    value: [
                        '> `/clan meta` - Criar metas para o clan',
                        '> `/clan status` - Ver progresso do clan',
                        '> `/clan top` - Ver top contribuidores'
                    ].join('\n'),
                    inline: false 
                });

                // ...rest of the existing stats display code...

                await interaction.editReply({ embeds: [embed] });
                return;
            }

            // Se nenhum nickname foi especificado, mostrar as próprias metas (código existente)
            const userFile = path.join(dataPath, `${userId}.json`);

            // Check if user has linked their account
            let userData;
            try {
                userData = JSON.parse(await fs.readFile(userFile, 'utf8'));
                if (!userData.nickname) throw new Error('No nickname set');
            } catch (err) {
                return interaction.editReply('❌ Você precisa vincular sua conta primeiro! Use `/meta vincular`');
            }

            // Fetch current stats from API using saved nickname
            const response = await axios.get(`https://mush.com.br/api/player/${userData.nickname}`);
            const playerData = response.data.response;

            // Verify Discord link is still valid
            if (!playerData.discord?.id || playerData.discord.id !== userId) {
                return interaction.editReply('❌ Sua conta não está mais vinculada ao Discord! Use `/meta vincular` novamente.');
            }

            const embed = new EmbedBuilder()
                .setTitle(`『<:xpzinho:1325645747995148308>』Progresso de ${userData.nickname}`)
                .setColor(playerData.profile_tag?.color || '#2f3136')
                .setThumbnail(`https://visage.surgeplay.com/bust/256/${playerData.account.unique_id}`)
                .setDescription(`
                    ### <:stevedab:1325647842991411301> Status do Jogador
                    > <:Mush:1325298452812271676> Clan: \`${playerData.clan?.name || 'Nenhum'}\`
                    > <:Etiqueta:1324751489771638856> Tag: \`${playerData.rank_tag?.name || 'Nenhuma'}\`
                    > ⏰ Atualizado <t:${Math.floor(Date.now()/1000)}:R>
                `)
                .setFooter({ 
                    text: `${interaction.guild?.name || 'Server'} • Metas serão resetadas todo sábado às 23:59`,
                    iconURL: interaction.guild?.iconURL({ dynamic: true }) || null
                });

            // Add game modes stats with enhanced visuals
            if (userData.bedwars?.goals) {
                const bedwarsStats = playerData.stats.bedwars;
                embed.addFields({ 
                    name: '『<:bedzinha:1325646160697753731>』BEDWARS STATUS',
                    value: [
                        `> Level: ${bedwarsStats.level} `,
                        `> FKDR: ${(bedwarsStats.fkdr/100).toFixed(2)} `,
                        `> WS: ${bedwarsStats.winstreak} (Max: ${bedwarsStats.max_winstreak})`,
                        `> XP: ${bedwarsStats.xp.toLocaleString()}`
                    ].join('\n'),
                    inline: false 
                });
                embed.addFields(this.createProgressFields('Bedwars', userData.bedwars, bedwarsStats));
            }

            if (userData.skywars?.goals) {
                const skywarsStats = playerData.stats.skywars_r1;
                embed.addFields({ 
                    name: '『<:Enderpearl:1325512314459521025>』SKYWARS STATS',
                    value: `Level: ${skywarsStats.level} \nKDR: ${(skywarsStats.kills/Math.max(skywarsStats.deaths, 1)).toFixed(2)} `,
                    inline: false 
                });
                embed.addFields(this.createProgressFields('Skywars', userData.skywars, skywarsStats));
            }

            await interaction.editReply({ embeds: [embed] });

        } catch (error) {
            console.error('Erro ao mostrar menu:', error);
            await interaction.editReply('❌ Erro ao carregar suas estatísticas.');
        }
    },

    createProgressFields(gameMode, userData, currentStats) {
        const fields = [];
        
        const now = new Date();
        const endDate = userData.endDate ? new Date(userData.endDate) : new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
        
        // Calcular dias e horas restantes
        const timeLeft = endDate.getTime() - now.getTime();
        const daysLeft = Math.max(0, Math.floor(timeLeft / (1000 * 60 * 60 * 24)));
        const hoursLeft = Math.max(0, Math.floor((timeLeft % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)));

        fields.push({
            name: `『${gameMode === 'Bedwars' ? '<:bedzinha:1325646160697753731>' : '<:Skywars:1324764979802411159>'}』METAS SEMANAIS • Vence em ${daysLeft}d ${hoursLeft}h`,
            value: '▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬',
            inline: false
        });

        for (const [key, goal] of Object.entries(userData.goals)) {
            try {
                let startValue = 0;
                let currentValue = 0;
                let gained = 0;

                if (gameMode === 'Bedwars') {
                    switch (key) {
                        case 'wins':
                            startValue = userData.startStats?.wins || 0;
                            currentValue = currentStats.wins || 0;
                            // O progresso é apenas o que foi ganho após definir a meta
                            gained = Math.max(0, currentValue - startValue);
                            break;
                        case 'kills':
                            startValue = userData.startStats?.final_kills || 0;
                            currentValue = currentStats.final_kills || 0;
                            gained = Math.max(0, currentValue - startValue);
                            break;
                        case 'beds':
                            startValue = userData.startStats?.beds_broken || 0;
                            currentValue = currentStats.beds_broken || 0;
                            gained = Math.max(0, currentValue - startValue);
                            break;
                        case 'nivel':
                            startValue = userData.startStats?.level || 0;
                            currentValue = currentStats.level || 0;
                            gained = Math.max(0, currentValue - startValue);
                            break;
                        case 'xp':
                            startValue = userData.startStats?.xp || 0;
                            currentValue = currentStats.xp || 0;
                            gained = Math.max(0, currentValue - startValue);
                            break;
                    }
                }
                // ...existing code for Skywars...

                // Calcular progresso real
                const progress = Math.min(Math.max(0, (gained / goal) * 100), 100);
                const remaining = Math.max(0, goal - gained);

                fields.push({
                    name: `${this.getEmoji(key)} ${key.toUpperCase()}`,
                    value: [
                        this.createProgressBar(progress),
                        gained >= goal ? 
                            '`✅ Meta Concluída!`' : 
                            `\`⏳ Progresso: ${gained.toLocaleString()}/${goal.toLocaleString()}${this.getSuffix(key)}\`\n` +
                            `\`📈 Faltam: ${remaining.toLocaleString()}${this.getSuffix(key)}\`\n` +
                            `\`🎯 Meta: ${goal.toLocaleString()}${this.getSuffix(key)}\`\n` +
                            `\`📊 Total na conta: ${currentValue.toLocaleString()}${this.getSuffix(key)}\`\n` +
                            `\`📈 Ganhos até agora: +${gained.toLocaleString()}${this.getSuffix(key)}\``
                    ].join('\n'),
                    inline: false
                });

            } catch (error) {
                console.error(`Erro ao processar meta ${key}:`, error);
                continue;
            }
        }

        return fields;
    },

    createProgressBar(percentage) {
        // Garantir que percentage é um número válido entre 0 e 100
        const validPercentage = Math.min(Math.max(0, Number(percentage) || 0), 100);
        
        // Calcular barras preenchidas e vazias
        const filled = Math.floor(validPercentage / 10);
        const empty = Math.max(0, 10 - filled);

        // Construir barra de progresso com verificação de segurança
        const bar = '■'.repeat(Math.max(0, filled)) + '□'.repeat(Math.max(0, empty));
        
        // Determinar cor baseado no progresso
        let color;
        if (validPercentage >= 100) color = '🟢';
        else if (validPercentage >= 75) color = '🟡';
        else if (validPercentage >= 50) color = '🟠';
        else if (validPercentage >= 25) color = '🔵';
        else color = '🔴';

        return `${color} \`${bar}\` **${validPercentage.toFixed(1)}%**`;
    },

    getSuffix(key) {
        const suffixes = {
            wins: ' Vitórias',
            kills: ' Kills',
            beds: ' Camas',
            nivel: ' Níveis',
            xp: ' XP'
        };
        return suffixes[key] || '';
    },

    getEmoji(key) {
        const emojis = {
            wins: '👑',
            kills: '<:diamond_sword:1325512395027648553>',
            beds: '<:Caminha:1324521740411605002>',
            nivel: '⭐',
            xp: '<:xpzinho:1325645747995148308>'
        };
        return emojis[key] || '📊';
    }
};
