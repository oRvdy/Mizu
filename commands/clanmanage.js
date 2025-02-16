const { SlashCommandBuilder, EmbedBuilder, PermissionsBitField } = require('discord.js');
const path = require('path');
const fs = require('fs').promises;
const axios = require('axios');

const OWNER_ID = '1283948475742031912'; // Substitua pelo seu ID de usuário do Discord

module.exports = {
    data: new SlashCommandBuilder()
        .setName('clanmanage')
        .setDescription('Gerencia seu clan')
        .addSubcommand(subcommand =>
            subcommand
                .setName('create')
                .setDescription('Criar um novo clan')
                .addStringOption(option => 
                    option.setName('nick')
                        .setDescription('Nick de um membro do clan')
                        .setRequired(true)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('add')
                .setDescription('Adiciona um membro ao clan')
                .addStringOption(option =>
                    option.setName('nick')
                        .setDescription('Nickname do jogador')
                        .setRequired(true)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('setowner')
                .setDescription('Define o dono do clan')
                .addStringOption(option =>
                    option.setName('tag')
                        .setDescription('Tag do clan')
                        .setRequired(true))
                .addUserOption(option =>
                    option.setName('user')
                        .setDescription('Usuário a ser definido como dono')
                        .setRequired(true))),

    async execute(interaction) {
        await interaction.deferReply({ ephemeral: true });
        const subcommand = interaction.options.getSubcommand();
        const filePath = path.join(__dirname, '..', 'data', 'clans.json');
        const data = JSON.parse(await fs.readFile(filePath, 'utf8'));

        try {
            switch (subcommand) {
                case 'create':
                    await handleCreateClan(interaction, data, filePath);
                    break;
                case 'add':
                    await handleAddMember(interaction, data, filePath);
                    break;
                case 'setowner':
                    await handleSetOwner(interaction, data, filePath);
                    break;
            }
        } catch (error) {
            console.error('Erro ao gerenciar clan:', error);
            await interaction.editReply('❌ Ocorreu um erro ao executar o comando.');
        }
    }
};

async function handleCreateClan(interaction, data, filePath) {
    const nick = interaction.options.getString('nick');

    try {
        // Buscar informações do jogador e do clan na API
        const response = await axios.get(`https://mush.com.br/api/player/${nick}`);
        if (!response.data.response) throw new Error('Jogador não encontrado');

        const { clan } = response.data.response;

        if (!clan) {
            return await interaction.editReply('❌ Este jogador não pertence a nenhum clan!');
        }

        const { name, tag, tag_color } = clan;

        if (data[tag]) {
            return await interaction.editReply('❌ Este clan já existe!');
        }

        // Criar novo clan
        data[tag] = {
            clan: {
                name: name,
                tag: tag,
                tag_color: tag_color,
                owner_id: interaction.user.id
            },
            members: [nick]
        };

        await fs.writeFile(filePath, JSON.stringify(data, null, 2));

        const embed = new EmbedBuilder()
            .setColor(tag_color)
            .setTitle('✅ Clan Criado com Sucesso!')
            .addFields(
                { name: 'Tag', value: tag, inline: true },
                { name: 'Nome', value: name, inline: true },
                { name: 'Dono', value: `<@${interaction.user.id}>`, inline: true }
            );

        await interaction.editReply({ embeds: [embed] });
    } catch (error) {
        console.error('Erro ao criar clan:', error);
        await interaction.editReply('❌ Jogador não encontrado ou erro ao criar clan!');
    }
}

async function handleAddMember(interaction, data, filePath) {
    const nick = interaction.options.getString('nick');
    
    // Encontrar o clan do usuário
    const userClan = Object.values(data).find(c => c.clan?.owner_id === interaction.user.id);
    
    if (!userClan) {
        return await interaction.editReply('❌ Você não é dono de nenhum clan!');
    }

    if (userClan.members.includes(nick)) {
        return await interaction.editReply('❌ Este jogador já está no clan!');
    }

    // Verificar se o jogador existe
    try {
        const response = await axios.get(`https://mush.com.br/api/player/${nick}`);
        if (!response.data.response) throw new Error('Jogador não encontrado');
        
        userClan.members.push(nick);
        await fs.writeFile(filePath, JSON.stringify(data, null, 2));

        await interaction.editReply(`✅ Jogador ${nick} adicionado ao clan com sucesso!`);
    } catch (error) {
        await interaction.editReply('❌ Jogador não encontrado ou erro ao adicionar!');
    }
}

async function handleSetOwner(interaction, data, filePath) {
    // Verificar se o usuário é o dono do bot
    if (interaction.user.id !== OWNER_ID) {
        return await interaction.editReply('❌ Apenas o dono do bot pode usar este comando.');
    }

    const tag = interaction.options.getString('tag').toUpperCase();
    const user = interaction.options.getUser('user');

    if (!data[tag]) {
        return await interaction.editReply('❌ Clan não encontrado!');
    }

    // Definir novo dono
    data[tag].clan.owner_id = user.id;

    await fs.writeFile(filePath, JSON.stringify(data, null, 2));

    await interaction.editReply(`✅ <@${user.id}> foi definido como dono do clan ${tag}!`);
}
