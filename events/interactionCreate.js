const { Events } = require('discord.js');
const chalk = require('chalk');
const { getUserProfile } = require('../utils/database');
const { startTutorial } = require('../utils/tutorial'); // This will be created later

module.exports = {
    name: Events.InteractionCreate,
    async execute(interaction) {
        const { client, user, guild } = interaction;

        // --- User Onboarding Check ---
        const userProfile = getUserProfile(guild.id, user.id);

        if (!userProfile || !userProfile.onboarded) {
            // User is new or hasn't completed the tutorial.
            // We'll start the tutorial instead of executing the command.
            // The tutorial function itself will handle the interaction response.
            console.log(chalk.yellow(`New user detected (${user.tag}). Starting tutorial...`));
            await startTutorial(interaction);
            return;
        }

        // --- Command and Interaction Routing ---
        if (interaction.isChatInputCommand()) {
            const command = client.commands.get(interaction.commandName);

            if (!command) {
                console.error(chalk.red(`No command matching ${interaction.commandName} was found.`));
                return;
            }

            try {
                await command.execute(interaction);
            } catch (error) {
                console.error(chalk.red(`Error executing /${interaction.commandName}`), error);
                if (interaction.replied || interaction.deferred) {
                    await interaction.followUp({ content: 'There was an error while executing this command!', ephemeral: true });
                } else {
                    await interaction.reply({ content: 'There was an error while executing this command!', ephemeral: true });
                }
            }
        } else if (interaction.isButton() || interaction.isStringSelectMenu() || interaction.isModalSubmit()) {
            // For component interactions, the customId should be prefixed (e.g., 'market_select_item')
            const commandName = interaction.customId.split('_')[0];
            const command = client.commands.get(commandName);

            if (!command) {
                console.error(chalk.red(`No command matching customId prefix ${commandName} was found.`));
                return;
            }

            // Check if the command file has a dedicated interaction handler
            if (command.handleInteraction) {
                try {
                    await command.handleInteraction(interaction);
                } catch (error) {
                    console.error(chalk.red(`Error handling interaction ${interaction.customId}`), error);
                    // Avoid 'interaction has already been acknowledged' errors
                    if (!interaction.replied && !interaction.deferred) {
                         await interaction.reply({ content: 'There was an error while handling this interaction!', ephemeral: true });
                    }
                }
            } else {
                console.warn(chalk.yellow(`Command ${commandName} received a component interaction but has no handleInteraction method.`));
            }
        }
    },
};