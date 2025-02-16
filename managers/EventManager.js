const { Events } = require('discord.js');

class EventManager {
    constructor(client, recruitmentManager) {
        this.client = client;
        this.recruitment = recruitmentManager;
    }

    registerCoreEvents() {
        this.client.on(Events.ClientReady, () => {
            console.log(`Logged in as ${this.client.user.tag}`);
        });

        this.client.on(Events.InteractionCreate, async interaction => {
            try {
                console.log(`Received interaction type: ${interaction.type}`);
                interaction.recruitment = this.recruitment;
                
                if (interaction.isButton()) {
                    console.log(`Button clicked: ${interaction.customId}`);
                    
                    if (interaction.customId === 'apply_recruitment') {
                        await this.recruitment.handleRecruitmentButton(interaction);
                    } 
                    else if (interaction.customId === 'apply_aranked') {
                        await this.recruitment.handleArankedRecruitment(interaction);
                    }
                    else if (interaction.customId === 'close_ticket') {
                        await this.recruitment.handleCloseTicket(interaction);
                    }
                }
                else if (interaction.isModalSubmit()) {
                    console.log(`Modal submitted: ${interaction.customId}`);
                    
                    if (interaction.customId === 'recruitment_modal') {
                        await this.recruitment.handleRecruitmentModal(interaction);
                    }
                    else if (interaction.customId === 'aranked_modal') {
                        await this.recruitment.handleArankedModal(interaction);
                    }
                }
                else if (interaction.isChatInputCommand()) {
                    const command = this.client.commands.get(interaction.commandName);
                    if (command) await command.execute(interaction);
                }
            } catch (error) {
                console.error('Interaction error:', error);
                try {
                    const reply = { 
                        content: 'Houve um erro ao processar sua solicitação.',
                        ephemeral: true
                    };
                    
                    if (interaction.replied) {
                        await interaction.followUp(reply);
                    } else {
                        await interaction.reply(reply);
                    }
                } catch (e) {
                    console.error('Error handling error:', e);
                }
            }
        });

        this.client.on('error', error => {
            console.error('Discord client error:', error);
        });
    }
}

module.exports = EventManager;
