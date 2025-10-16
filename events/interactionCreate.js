const { Events } = require('discord.js');
const chalk = require('chalk');
const { getUserProfile, createUserProfile } = require('../utils/database');
const { startTutorial } = require('../utils/tutorial');

module.exports = {
    name: Events.InteractionCreate,
    async execute(interaction) {
        const { client, user, guild } = interaction;

const { ContainerBuilder, TextDisplayBuilder, ButtonBuilder, ButtonStyle, ActionRowBuilder, MessageFlags } = require('discord.js');
// ...
    async execute(interaction) {
        const { client, user, guild } = interaction;

        // --- User Onboarding Check ---
        let userProfile = getUserProfile(guild.id, user.id);

        // If the interaction is the tutorial start button, let it pass to the tutorial handler
        if (interaction.isButton() && interaction.customId === 'start_tutorial') {
            await startTutorial(interaction);
            return;
        }

        if (!userProfile) {
            // First interaction ever, create a profile stub
            userProfile = createUserProfile(guild.id, user.id);
            console.log(chalk.blue(`Created profile stub for new user ${user.tag}.`));
        }

        if (!userProfile.onboarded) {
            // User hasn't completed the tutorial. Prompt them to start.
            console.log(chalk.yellow(`User ${user.tag} has not been onboarded. Prompting to start tutorial.`));

            const promptContainer = new ContainerBuilder()
                .setAccentColor(0xFFCC00)
                .addTextDisplayComponents(
                    new TextDisplayBuilder().setContent("**Access Denied: Onboarding Required**"),
                    new TextDisplayBuilder().setContent("To access the Apex Grid and its commands, you must first complete a one-time interactive briefing.")
                );

            const promptRow = new ActionRowBuilder().addComponents(
                new ButtonBuilder()
                    .setCustomId('start_tutorial')
                    .setLabel('Begin Briefing')
                    .setStyle(ButtonStyle.Primary)
            );

            await interaction.reply({ components: [promptContainer, promptRow], ephemeral: true, flags: [MessageFlags.IsComponentsV2] });
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