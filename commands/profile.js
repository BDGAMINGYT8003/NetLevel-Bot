const { SlashCommandBuilder, ContainerBuilder, TextDisplayBuilder, MessageFlags } = require('discord.js');
const { getUser } = require('../utils/database');
const { leveling } = require('../config');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('profile')
        .setDescription('Displays your Apex Grid profile and stats for the current month.')
        .addUserOption(option =>
            option.setName('user')
                .setDescription('The user whose profile you want to view.')
                .setRequired(false)),

    async execute(interaction) {
        const targetUser = interaction.options.getUser('user') || interaction.user;
        const guildId = interaction.guild.id;

        const userData = getUser(guildId, targetUser.id);

        if (!userData) {
            await interaction.reply({
                content: `${targetUser.username} has not been onboarded to the Apex Grid yet. They need to interact with the bot first.`,
                ephemeral: true
            });
            return;
        }

        const { level, xp, ciTokens } = userData;
        const xpForNextLevel = leveling.baseXp + (leveling.xpMultiplier * level);

        // --- Progress Bar Logic ---
        const progress = Math.round((xp / xpForNextLevel) * 10);
        const progressBar = '▰'.repeat(progress) + '▱'.repeat(10 - progress);

        // --- Build Components v2 Rank Card ---
        const profileCard = new ContainerBuilder()
            .setAccentColor(0xFFD700) // Gold accent
            .addTextDisplayComponents(
                new TextDisplayBuilder().setContent(`**${targetUser.username}'s Apex Grid Profile**`),
                new TextDisplayBuilder().setContent(`**Level:** ${level}`),
                new TextDisplayBuilder().setContent(`**CI Tokens:** ${ciTokens.toFixed(1)} <:token:123456789012345678>`) // Placeholder for a custom emoji
            )
            .addSectionComponents(section => section
                .addTextDisplayComponents(
                    new TextDisplayBuilder().setContent(`**XP:** ${xp.toFixed(0)} / ${xpForNextLevel.toFixed(0)}`),
                    new TextDisplayBuilder().setContent(`\`${progressBar}\``)
                )
            );

        await interaction.reply({
            components: [profileCard],
            flags: MessageFlags.IsComponentsV2,
            ephemeral: false // Show profile to everyone
        });
    },
};