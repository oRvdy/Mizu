const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('botinfo')
        .setDescription('[Mush] Informações sobre o bot.'),
    async execute(interaction) {
        const embed = new EmbedBuilder()
            .setTitle('Informações sobre o Bot')
            .setColor('#0099ff')
            .setDescription(`
                \`•\` **Linguagem**: Fui programado em JavaScript (Node.js) usando discord.js!
                \`•\` **Links úteis**:
                [Documentação do JavaScript](https://developer.mozilla.org/en-US/docs/Web/JavaScript)
                [Documentação do Node.js](https://nodejs.org/en/docs/)
                [Documentação do discord.js](https://discord.js.org/#/docs/main/stable/general/welcome)
            `)
            .setFooter({ text: 'Desenvolvido por Rezando', iconURL: 'https://cdn.discordapp.com/avatars/1283948475742031912/fb0b536e1dad49337d09d5d67504a8b2.png' })
            .setTimestamp();

        const buttons = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setLabel('Me Adicione')
                .setURL('https://discord.com/oauth2/authorize?client_id=1324388124595589152&permissions=8&integration_type=0&scope=bot')
                .setStyle(ButtonStyle.Link),
            new ButtonBuilder()
                .setLabel('Servidor de Suporte')
                .setURL('https://discord.gg/gp97MzATnG')
                .setStyle(ButtonStyle.Link)
        );

        await interaction.reply({
            embeds: [embed],
            components: [buttons],
        });
    },
};
