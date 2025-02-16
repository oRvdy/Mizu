const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const path = require('path');
const fs = require('fs').promises;
const axios = require('../utils/axios');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('meta')
        .setDescription('Sistema de metas')
        // Primeiro definir o subcommandGroup clan
        .addSubcommandGroup(group =>
            group
                .setName('clan')
                .setDescription('Gerenciar metas do clan')
                .addSubcommand(subcommand =>
                    subcommand
                        .setName('criar')
                        .setDescription('Criar um grupo de metas do clan')
                        .addStringOption(option =>
                            option
                                .setName('nome')
                                .setDescription('Nome do grupo')
                                .setRequired(true))
                        .addStringOption(option =>
                            option
                                .setName('membros')
                                .setDescription('Nicks dos membros (separados por vírgula)')
                                .setRequired(true)))
                .addSubcommand(subcommand =>
                    subcommand
                        .setName('status')
                        .setDescription('Ver status do grupo'))
                .addSubcommand(subcommand =>
                    subcommand
                        .setName('top')
                        .setDescription('Ver top contribuidores do grupo')))
        // Então adicionar os outros subcommands normais
        .addSubcommand(subcommand =>
            subcommand
                .setName('vincular')
                .setDescription('Vincular sua conta do Mush')
                .addStringOption(option =>
                    option
                        .setName('nick')
                        .setDescription('Seu nickname no Mush')
                        .setRequired(true)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('bedwars')
                .setDescription('Definir metas para Bedwars')
                .addIntegerOption(option => 
                    option.setName('wins')
                        .setDescription('Meta de vitórias (deixe vazio para manter a meta atual)')
                        .setMinValue(1)
                        .setRequired(false))
                .addIntegerOption(option => 
                    option.setName('kills')
                        .setDescription('Meta de kills (deixe vazio para manter a meta atual)')
                        .setMinValue(1)
                        .setRequired(false))
                .addIntegerOption(option => 
                    option.setName('beds')
                        .setDescription('Meta de camas (deixe vazio para manter a meta atual)')
                        .setMinValue(1)
                        .setRequired(false))
                .addIntegerOption(option => 
                    option.setName('nivel')
                        .setDescription('Meta de nível (deixe vazio para manter a meta atual)')
                        .setMinValue(1)
                        .setRequired(false))
                .addIntegerOption(option => 
                    option.setName('xp')
                        .setDescription('Meta de XP semanal')
                        .setMinValue(1)
                        .setRequired(false)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('skywars')
                .setDescription('Definir metas para Skywars')
                .addIntegerOption(option => 
                    option.setName('wins')
                        .setDescription('Meta de vitórias')
                        .setRequired(false))
                .addIntegerOption(option => 
                    option.setName('kills')
                        .setDescription('Meta de kills')
                        .setRequired(false))
                .addIntegerOption(option => 
                    option.setName('nivel')
                        .setDescription('Meta de nível')
                        .setRequired(false))
                .addIntegerOption(option => 
                    option.setName('xp')
                        .setDescription('Meta de XP semanal')
                        .setMinValue(1)
                        .setRequired(false)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('reset')
                .setDescription('Resetar todas as suas metas'))
        // Adicionar novos subcomandos administrativos
        .addSubcommand(subcommand =>
            subcommand
                .setName('set')
                .setDescription('Definir metas para um jogador (Admin)')
                .addStringOption(option =>
                    option.setName('nick')
                        .setDescription('Nickname do jogador')
                        .setRequired(true))
                .addStringOption(option =>
                    option.setName('modo')
                        .setDescription('Modo de jogo')
                        .setRequired(true)
                        .addChoices(
                            { name: 'Bedwars', value: 'bedwars' },
                            { name: 'Skywars', value: 'skywars' }
                        ))
                .addIntegerOption(option => 
                    option.setName('wins')
                        .setDescription('Meta de vitórias')
                        .setMinValue(1))
                .addIntegerOption(option => 
                    option.setName('kills')
                        .setDescription('Meta de kills')
                        .setMinValue(1))
                .addIntegerOption(option => 
                    option.setName('beds')
                        .setDescription('Meta de camas (apenas Bedwars)')
                        .setMinValue(1))
                .addIntegerOption(option => 
                    option.setName('nivel')
                        .setDescription('Meta de nível')
                        .setMinValue(1))
                .addIntegerOption(option => 
                    option.setName('xp')
                        .setDescription('Meta de XP')
                        .setMinValue(1)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('resetar')
                .setDescription('Resetar metas de um jogador (Admin)')
                .addStringOption(option =>
                    option.setName('nick')
                        .setDescription('Nickname do jogador')
                        .setRequired(true))),

    async execute(interaction) {
        const subcommandGroup = interaction.options.getSubcommandGroup(false);
        const subcommand = interaction.options.getSubcommand();
        const dataPath = path.join(__dirname, '..', 'data', 'metas'); // Definir dataPath aqui

        // Verificar licença do servidor
        if (!interaction.client.licenses.isAuthorized(interaction.guildId)) {
            return interaction.reply({
                content: '❌ Este servidor não está autorizado a usar este comando.\nEntre em contato com o desenvolvedor para adquirir uma licença.',
                ephemeral: true
            });
        }

        const userId = interaction.user.id;
        const userFile = path.join(dataPath, `${userId}.json`);

        // Verificar permissões para comandos administrativos
        if (['set', 'resetar'].includes(subcommand)) {
            if (!interaction.member.permissions.has('Administrator')) {
                return interaction.reply({
                    content: '❌ Apenas administradores podem usar este comando.',
                    ephemeral: true
                });
            }
        }

        // Primeiro verificar se é um comando do clan
        if (subcommandGroup === 'clan') {
            switch (subcommand) {
                case 'criar': return await this.handleClanCreate(interaction);
                case 'status': return await this.handleClanStatus(interaction);
                case 'top': return await this.handleClanTop(interaction);
            }
        }

        // Se não for clan, proceder com os outros comandos
        switch (subcommand) {
            case 'vincular': // ...existing code...
            case 'bedwars': // ...existing code...
            case 'skywars': // ...existing code...
            case 'reset': // ...existing code...
            // ...existing cases...
        }

        try {
            await fs.mkdir(dataPath, { recursive: true });

            // Handle new admin commands
            switch (subcommand) {
                case 'set': {
                    const targetNick = interaction.options.getString('nick');
                    const modo = interaction.options.getString('modo');
                    
                    try {
                        // Verificar se o jogador existe
                        const response = await axios.get(`https://mush.com.br/api/player/${targetNick}`);
                        const playerData = response.data.response;
                        
                        // Buscar ou criar arquivo de metas do jogador
                        const files = await fs.readdir(dataPath);
                        let targetUserFile;
                        let targetUserData;

                        // Procurar arquivo existente ou criar novo
                        for (const file of files) {
                            if (!file.endsWith('.json')) continue;
                            const userData = JSON.parse(await fs.readFile(path.join(dataPath, file), 'utf8'));
                            if (userData.nickname.toLowerCase() === targetNick.toLowerCase()) {
                                targetUserFile = path.join(dataPath, file);
                                targetUserData = userData;
                                break;
                            }
                        }

                        if (!targetUserData) {
                            // Criar novo arquivo de metas
                            targetUserData = {
                                nickname: targetNick,
                                bedwars: { goals: {}, startStats: {} },
                                skywars: { goals: {}, startStats: {} }
                            };
                            targetUserFile = path.join(dataPath, `${playerData.discord?.id || Date.now()}.json`);
                        }

                        // Atualizar metas
                        const stats = modo === 'bedwars' ? playerData.stats.bedwars : playerData.stats.skywars_r1;
                        const options = ['wins', 'kills', 'beds', 'nivel', 'xp'];
                        let hasNewGoals = false;

                        options.forEach(opt => {
                            if (opt === 'beds' && modo !== 'bedwars') return;
                            const value = interaction.options.getInteger(opt);
                            if (value !== null) {
                                targetUserData[modo].goals[opt] = value;
                                this.setInitialStats(targetUserData[modo], opt, stats);
                                hasNewGoals = true;
                            }
                        });

                        if (!hasNewGoals) {
                            return interaction.reply({
                                content: '❌ Você precisa definir pelo menos uma meta!',
                                ephemeral: true
                            });
                        }

                        // Salvar dados
                        await fs.writeFile(targetUserFile, JSON.stringify(targetUserData, null, 2));

                        const embed = new EmbedBuilder()
                            .setTitle('✅ Metas Definidas')
                            .setDescription(`Metas definidas para **${targetNick}** em **${modo.toUpperCase()}**`)
                            .setColor('#00ff00')
                            .addFields(
                                Object.entries(targetUserData[modo].goals).map(([key, value]) => ({
                                    name: this.getEmoji(key) + ' ' + key.toUpperCase(),
                                    value: `Meta: ${value.toLocaleString()}`,
                                    inline: true
                                }))
                            );

                        await interaction.reply({ embeds: [embed], ephemeral: true });
                    } catch (error) {
                        console.error('Erro ao definir metas:', error);
                        if (!interaction.replied) {
                            await interaction.reply({
                                content: '❌ Erro ao definir metas. Verifique se o nickname está correto.',
                                ephemeral: true
                            });
                        }
                    }
                    break;
                }

                case 'resetar': {
                    const targetNick = interaction.options.getString('nick');
                    
                    try {
                        const files = await fs.readdir(dataPath);
                        let targetUserFile;
                        let targetUserData;

                        for (const file of files) {
                            if (!file.endsWith('.json')) continue;
                            const userData = JSON.parse(await fs.readFile(path.join(dataPath, file), 'utf8'));
                            if (userData.nickname.toLowerCase() === targetNick.toLowerCase()) {
                                targetUserFile = path.join(dataPath, file);
                                targetUserData = userData;
                                break;
                            }
                        }

                        if (!targetUserData) {
                            return interaction.reply({
                                content: `❌ Nenhuma meta encontrada para o jogador ${targetNick}`,
                                ephemeral: true
                            });
                        }

                        // Resetar metas
                        targetUserData.bedwars.goals = {};
                        targetUserData.skywars.goals = {};
                        await fs.writeFile(targetUserFile, JSON.stringify(targetUserData, null, 2));

                        await interaction.reply({
                            content: `✅ Metas de ${targetNick} foram resetadas com sucesso!`,
                            ephemeral: true
                        });
                    } catch (error) {
                        console.error('Erro ao resetar metas:', error);
                        await interaction.reply({
                            content: '❌ Erro ao resetar metas.',
                            ephemeral: true
                        });
                    }
                    break;
                }

                // ...existing subcommand cases...
            }

            // Handle vincular subcommand
            if (interaction.options.getSubcommand() === 'vincular') {
                const nickname = interaction.options.getString('nick');
                try {
                    const response = await axios.get(`https://mush.com.br/api/player/${nickname}`);
                    const playerData = response.data.response;

                    if (!playerData.discord?.id || playerData.discord.id !== userId) {
                        return interaction.reply({
                            content: '❌ Esta conta não está vinculada ao seu Discord! Use `/discord` no servidor do Mush primeiro.',
                            ephemeral: true
                        });
                    }

                    const now = new Date();
                    const endDate = this.getNextSundayMidnight();
                    
                    // Estrutura de dados inicial completa
                    const userData = {
                        nickname: nickname,
                        bedwars: { 
                            goals: {},
                            startStats: {},
                            startDate: now.toISOString(),
                            endDate: endDate.toISOString()
                        },
                        skywars: { 
                            goals: {},
                            startStats: {},
                            startDate: now.toISOString(),
                            endDate: endDate.toISOString()
                        }
                    };

                    await fs.writeFile(userFile, JSON.stringify(userData, null, 2));
                    return interaction.reply({
                        content: `✅ Conta ${nickname} vinculada com sucesso! Agora você pode definir suas metas.`,
                        ephemeral: true
                    });
                } catch (error) {
                    return interaction.reply({
                        content: '❌ Jogador não encontrado ou erro ao verificar conta.',
                        ephemeral: true
                    });
                }
            }

            // Check if user has linked their account
            let userData;
            try {
                userData = JSON.parse(await fs.readFile(userFile, 'utf8'));
                if (!userData.nickname) throw new Error('No nickname set');
            } catch (err) {
                return interaction.reply({
                    content: '❌ Você precisa vincular sua conta primeiro! Use `/meta vincular`',
                    ephemeral: true
                });
            }

            // If not vincular or reset command, fetch player data first
            if (!['vincular', 'reset'].includes(interaction.options.getSubcommand())) {
                try {
                    const response = await axios.get(`https://mush.com.br/api/player/${userData.nickname}`);
                    const playerData = response.data.response;
                    const gamemode = interaction.options.getSubcommand();
                    const stats = gamemode === 'bedwars' ? playerData.stats.bedwars : playerData.stats.skywars_r1;

                    // Inicializar estrutura
                    if (!userData[gamemode]) {
                        userData[gamemode] = {
                            goals: {},
                            startStats: {},
                            startDate: new Date().toISOString(),
                            endDate: this.getNextSundayMidnight().toISOString()
                        };
                    }

                    let hasNewGoals = false;
                    const options = gamemode === 'bedwars' 
                        ? ['wins', 'kills', 'beds', 'nivel', 'xp']
                        : ['wins', 'kills', 'nivel', 'xp'];

                    // Garantir que startStats existe
                    userData[gamemode].startStats = userData[gamemode].startStats || {};

                    options.forEach(opt => {
                        const value = interaction.options.getInteger(opt);
                        if (value !== null) {
                            // Definir meta
                            userData[gamemode].goals[opt] = value;
                            
                            // Salvar valores iniciais precisos
                            if (gamemode === 'bedwars') {
                                switch (opt) {
                                    case 'wins':
                                        userData[gamemode].startStats.wins = stats.wins || 0;
                                        userData[gamemode].startStats.current_wins = stats.wins || 0;
                                        break;
                                    case 'kills':
                                        userData[gamemode].startStats.final_kills = stats.final_kills || 0;
                                        userData[gamemode].startStats.current_final_kills = stats.final_kills || 0;
                                        break;
                                    case 'beds':
                                        userData[gamemode].startStats.beds_broken = stats.beds_broken || 0;
                                        userData[gamemode].startStats.current_beds_broken = stats.beds_broken || 0;
                                        break;
                                    case 'nivel':
                                        userData[gamemode].startStats.level = stats.level || 0;
                                        userData[gamemode].startStats.current_level = stats.level || 0;
                                        break;
                                    case 'xp':
                                        userData[gamemode].startStats.xp = stats.xp || 0;
                                        userData[gamemode].startStats.current_xp = stats.xp || 0;
                                        break;
                                }
                            } else {
                                // Skywars
                                switch (opt) {
                                    case 'wins':
                                        userData[gamemode].startStats.wins = stats.wins || 0;
                                        userData[gamemode].startStats.wins_monthly = stats.wins_monthly || 0;
                                        break;
                                    case 'kills':
                                        userData[gamemode].startStats.kills = stats.kills || 0;
                                        userData[gamemode].startStats.kills_monthly = stats.kills_monthly || 0;
                                        break;
                                    case 'nivel':
                                        userData[gamemode].startStats.level = stats.level || 0;
                                        break;
                                    case 'xp':
                                        userData[gamemode].startStats.xp = stats.xp || 0;
                                        userData[gamemode].startStats.xp_monthly = stats.xp_monthly || 0;
                                        break;
                                }
                            }
                            hasNewGoals = true;
                        }
                    });

                    if (!hasNewGoals) {
                        return interaction.reply({
                            content: '❌ Você precisa definir pelo menos uma meta!',
                            ephemeral: true
                        });
                    }

                    // Salvar dados atualizados
                    await fs.writeFile(userFile, JSON.stringify(userData, null, 2));

                    // Create embed with all goals
                    const embed = new EmbedBuilder()
                        .setAuthor({ 
                            name: userData.nickname, 
                            iconURL: `https://visage.surgeplay.com/face/256/${playerData.account.unique_id}` 
                        })
                        .setTitle('『<:Mush:1325298452812271676>』Metas Configuradas')
                        .setColor(userData[gamemode].startDate === new Date().toISOString() ? '#00ff00' : '#ffa500')
                        .setDescription(`
                            > 🎮 Modo: **${gamemode.toUpperCase()}**
                            > ⏰ Status: **Nova Meta**
                            > 📅 Prazo: <t:${Math.floor(new Date(userData[gamemode].endDate).getTime()/1000)}:R>
                        `)
                        .addFields(
                            Object.entries(userData[gamemode].goals).map(([key, value]) => ({
                                name: `${this.getEmoji(key)} ${key.charAt(0).toUpperCase() + key.slice(1)}`,
                                value: `\`Meta: ${value.toLocaleString()}\``,
                                inline: true
                            }))
                        )
                        .setFooter({ 
                            text: `${interaction.guild?.name || 'Server'} • Use /menu para acompanhar seu progresso, não esqueça de utilizar /meta reset ao fim de semana.`,
                            iconURL: interaction.guild?.iconURL({ dynamic: true }) || null
                        })
                        .setTimestamp();

                    return interaction.reply({ embeds: [embed], ephemeral: true });
                } catch (error) {
                    console.error('Erro ao buscar dados do jogador:', error);
                    return interaction.reply({
                        content: '❌ Erro ao buscar seus dados. Verifique se sua conta ainda está vinculada.',
                        ephemeral: true
                    });
                }
            }

            // Handle reset subcommand
            if (interaction.options.getSubcommand() === 'reset') {
                const nickname = userData.nickname;
                const now = new Date();
                const endDate = this.getNextSundayMidnight();
                await fs.writeFile(userFile, JSON.stringify({
                    nickname,
                    bedwars: { 
                        goals: {},
                        startDate: now.toISOString(),
                        endDate: endDate.toISOString()
                    },
                    skywars: {
                        goals: {},
                        startDate: now.toISOString(),
                        endDate: endDate.toISOString()
                    }
                }, null, 2));
                return interaction.reply({
                    content: '✅ Suas metas foram resetadas! Você pode definir novas metas agora.',
                    ephemeral: true
                });
            }

        } catch (error) {
            console.error('Erro ao configurar metas:', error);
            if (!interaction.replied) {
                await interaction.reply({
                    content: '❌ Erro ao configurar suas metas.',
                    ephemeral: true
                });
            }
        }
    },

    async handleClanCreate(interaction) {
        await interaction.deferReply();
        try {
            const groupName = interaction.options.getString('nome');
            const membersString = interaction.options.getString('membros');
            const members = membersString.split(',').map(nick => nick.trim());

            // Verificar cada membro
            const memberData = [];
            for (const nick of members) {
                const response = await axios.get(`https://mush.com.br/api/player/${nick}`);
                const playerData = response.data.response;
                
                // Verificar se todos são do mesmo clan
                if (!playerData.clan) {
                    return interaction.editReply(`❌ O jogador ${nick} não está em nenhum clan!`);
                }

                memberData.push({
                    nickname: nick,
                    clan: playerData.clan.name,
                    startStats: {
                        xp: playerData.stats.bedwars.xp || 0,
                        wins: playerData.stats.bedwars.wins || 0
                    }
                });
            }

            // Verificar se todos são do mesmo clan
            const clanName = memberData[0].clan;
            if (!memberData.every(m => m.clan === clanName)) {
                return interaction.editReply('❌ Todos os membros precisam ser do mesmo clan!');
            }

            // Criar arquivo do grupo
            const groupData = {
                name: groupName,
                clan: clanName,
                createdAt: Date.now(),
                createdBy: interaction.user.id,
                members: memberData,
                goals: {
                    xp: 100000, // Meta padrão de XP
                    wins: 100 // Meta padrão de vitórias
                }
            };

            const groupsPath = path.join(__dirname, '..', 'data', 'clan_groups');
            await fs.mkdir(groupsPath, { recursive: true });
            await fs.writeFile(
                path.join(groupsPath, `${interaction.guild.id}.json`),
                JSON.stringify(groupData, null, 2)
            );

            const embed = new EmbedBuilder()
                .setColor('#00ff00')
                .setTitle('✅ Grupo do Clan Criado')
                .setDescription(`
                    > 📋 Nome: **${groupName}**
                    > 🛡️ Clan: **${clanName}**
                    > 👥 Membros: **${members.length}**
                    
                    Use \`/meta clan status\` para ver o progresso!
                `);

            await interaction.editReply({ embeds: [embed] });
        } catch (error) {
            console.error('Erro ao criar grupo:', error);
            await interaction.editReply('❌ Erro ao criar grupo do clan.');
        }
    },

    async handleClanStatus(interaction) {
        await interaction.deferReply();
        try {
            const groupsPath = path.join(__dirname, '..', 'data', 'clan_groups');
            const groupFile = path.join(groupsPath, `${interaction.guild.id}.json`);
            
            const groupData = JSON.parse(await fs.readFile(groupFile, 'utf8'));
            let totalXP = 0;
            let totalWins = 0;
            
            // Atualizar stats de cada membro
            for (const member of groupData.members) {
                const response = await axios.get(`https://mush.com.br/api/player/${member.nickname}`);
                const currentStats = response.data.response.stats.bedwars;
                
                const xpGained = currentStats.xp - member.startStats.xp;
                const winsGained = currentStats.wins - member.startStats.wins;
                
                totalXP += xpGained;
                totalWins += winsGained;
            }

            const embed = new EmbedBuilder()
                .setColor('#0099ff')
                .setTitle(`📊 Status do Grupo: ${groupData.name}`)
                .setDescription(`
                    ### 🛡️ Clan: ${groupData.clan}
                    > ⭐ XP Total: **${totalXP.toLocaleString()}**/${groupData.goals.xp.toLocaleString()}
                    > 👑 Vitórias: **${totalWins}**/${groupData.goals.wins}
                    
                    Use \`/meta clan top\` para ver os maiores contribuidores!
                `);

            await interaction.editReply({ embeds: [embed] });
        } catch (error) {
            console.error('Erro ao mostrar status:', error);
            await interaction.editReply('❌ Erro ao carregar status do grupo.');
        }
    },

    async handleClanTop(interaction) {
        await interaction.deferReply();
        try {
            const groupsPath = path.join(__dirname, '..', 'data', 'clan_groups');
            const groupFile = path.join(groupsPath, `${interaction.guild.id}.json`);
            
            const groupData = JSON.parse(await fs.readFile(groupFile, 'utf8'));
            const contributions = [];
            
            // Calcular contribuição de cada membro
            for (const member of groupData.members) {
                const response = await axios.get(`https://mush.com.br/api/player/${member.nickname}`);
                const currentStats = response.data.response.stats.bedwars;
                
                const xpGained = currentStats.xp - member.startStats.xp;
                const winsGained = currentStats.wins - member.startStats.wins;
                
                contributions.push({
                    nickname: member.nickname,
                    xp: xpGained,
                    wins: winsGained
                });
            }

            // Ordenar por XP
            contributions.sort((a, b) => b.xp - a.xp);

            const embed = new EmbedBuilder()
                .setColor('#ffd700')
                .setTitle(`🏆 Top Contribuidores - ${groupData.name}`)
                .setDescription(
                    contributions.slice(0, 3).map((member, index) => {
                        const medals = ['🥇', '🥈', '🥉'];
                        return `${medals[index]} **${member.nickname}**\n` +
                               `> XP: ${member.xp.toLocaleString()}\n` +
                               `> Vitórias: ${member.wins}`;
                    }).join('\n\n')
                );

            await interaction.editReply({ embeds: [embed] });
        } catch (error) {
            console.error('Erro ao mostrar top:', error);
            await interaction.editReply('❌ Erro ao carregar top contribuidores.');
        }
    },

    getNextSundayMidnight() {
        const now = new Date();
        // Converter para timezone de Brasília
        const brasiliaOffset = -3; // UTC-3
        now.setHours(now.getHours() + brasiliaOffset);
        
        // Calcular dias até sábado (6 = sábado, 0 = domingo, etc)
        const daysUntilSaturday = (6 + 7 - now.getDay()) % 7;
        const nextSaturday = new Date(now);
        // Se já é sábado, adiciona 7 dias para o próximo
        nextSaturday.setDate(now.getDate() + (daysUntilSaturday === 0 ? 7 : daysUntilSaturday));
        // Configura para 23:59 de sábado
        nextSaturday.setHours(23 + brasiliaOffset, 59, 59, 999);
        
        return nextSaturday;
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
    },

    // Método auxiliar para definir estatísticas iniciais
    setInitialStats(modeData, stat, stats) {
        switch (stat) {
            case 'wins':
                modeData.startStats.wins = stats.wins || 0;
                modeData.startStats.wins_monthly = stats.wins_monthly || 0;
                break;
            case 'kills':
                if (stats.final_kills !== undefined) {
                    modeData.startStats.final_kills = stats.final_kills || 0;
                    modeData.startStats.final_kills_monthly = stats.final_kills_monthly || 0;
                } else {
                    modeData.startStats.kills = stats.kills || 0;
                    modeData.startStats.kills_monthly = stats.kills_monthly || 0;
                }
                break;
            case 'beds':
                modeData.startStats.beds_broken = stats.beds_broken || 0;
                modeData.startStats.beds_broken_monthly = stats.beds_broken_monthly || 0;
                break;
            case 'nivel':
                modeData.startStats.level = stats.level || 0;
                break;
            case 'xp':
                modeData.startStats.xp = stats.xp || 0;
                modeData.startStats.xp_monthly = stats.xp_monthly || 0;
                break;
        }
    }
};
