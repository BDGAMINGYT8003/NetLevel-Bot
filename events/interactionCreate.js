const { Events, ContainerBuilder, TextDisplayBuilder, ButtonBuilder, ButtonStyle, ActionRowBuilder, MessageFlags } = require('discord.js');
const chalk = require('chalk');
const { getUserProfile, createUserProfile } = require('../utils/database');
const { startTutorial } = require('../utils/tutorial');

module.exports = {
    name: Events.InteractionCreate,
    async execute(interaction) {
        const { client, user, guild } = interaction;

        // --- Tutorial Interaction Filtering ---
        // If the interaction is a button click and its customId is related to the tutorial,
        // let the tutorial's dedicated collector handle it by stopping further processing here.
        if (interaction.isButton() && (interaction.customId.startsWith('tutorial_') || interaction.customId === 'start_tutorial')) {
             if (interaction.customId === 'start_tutorial') {
                // This is the initial button click to begin the tutorial.
                await startTutorial(interaction);
             }
             // For 'tutorial_next_` buttons, the collector in tutorial.js will pick them up.
             // We just need to stop this handler from processing them further.
             return;
        }

        // --- User Onboarding Check ---
        let userProfile = getUserProfile(guild.id, user.id);

        if (!userProfile) {
            userProfile = createUserProfile(guild.id, user.id);
            console.log(chalk.blue(`Created profile stub for new user ${user.tag}.`));
        }

        if (!userProfile.onboarded) {
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
                    await interaction.followUp({ content: 'There was an error executing this command!', ephemeral: true });
                } else {
                    await interaction.reply({ content: 'There was an error executing this command!', ephemeral: true });
                }
            }
        } else if (interaction.isButton() || interaction.isStringSelectMenu() || interaction.isModalSubmit()) {
            const commandName = interaction.customId.split('_')[0];
            const command = client.commands.get(commandName);
            if (!command) {
                console.error(chalk.red(`No command matching customId prefix ${commandName} was found.`));
                return;
            }
            if (command.handleInteraction) {
                try {
                    await command.handleInteraction(interaction);
                } catch (error) {
                    console.error(chalk.red(`Error handling interaction ${interaction.customId}`), error);
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