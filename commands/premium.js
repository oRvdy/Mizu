
const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('premium')
        .setDescription('Informações sobre o Premium')
        .addSubcommand(subcommand =>
            subcommand
                .setName('info')
                .setDescription('Ver informações sobre o Premium')),

    async execute(interaction) {
        if (interaction.options.getSubcommand() === 'info') {
            const embed = new EmbedBuilder()
                .setColor('#FFD700')
                .setTitle('✨ Premium')
                .setDescription([
                    '### 🌟 Benefícios Premium',
                    '• Acesso a recursos exclusivos',
                    '• Suporte prioritário',
                    '',
                    '### 💎 Como Obter',
                    '• Entre em contato com <@1283948475742031912>',
                    '• Preços e planos personalizados',
                    '',
                    '### 📝 Observações',
                    '• Licença por servidor',
                    '• Pagamento único ou mensal',
                    '• Ativação imediata'
                ].join('\n'));

            await interaction.reply({ embeds: [embed], flags: 64 });
        }
    }
};