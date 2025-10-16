const { SlashCommandBuilder, ContainerBuilder, TextDisplayBuilder, SeparatorBuilder, SeparatorSpacingSize, MessageFlags } = require('discord.js');
const { getUserProfile } = require('../utils/database');
const { getCumulativeXpForLevel } = require('../utils/xpUtils');

// Helper function to create a text-based progress bar
function createProgressBar(current, max, length = 20) {
    if (max === 0) return `[${' '.repeat(length)}]`; // Avoid division by zero
    const percentage = Math.max(0, Math.min(1, current / max));
    const progress = Math.round(length * percentage);
    const empty = length - progress;

    const progressBar = '█'.repeat(progress) + ' '.repeat(empty);
    return `[${progressBar}]`;
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName('profile')
        .setDescription("Displays your current monthly stats on the Apex Grid.")
        .addUserOption(option =>
            option.setName('user')
                .setDescription('The user whose profile you want to see.')
                .setRequired(false)),
    async execute(interaction) {
        const targetUser = interaction.options.getUser('user') || interaction.user;
        const userProfile = getUserProfile(interaction.guild.id, targetUser.id);

        if (!userProfile) {
            const content = targetUser.id === interaction.user.id
                ? "You are not yet registered on the Apex Grid. Use any command to start the tutorial!"
                : "This user is not yet registered on the Apex Grid.";

            const notRegisteredContainer = new ContainerBuilder()
                .setAccentColor(0xFF0000) // Red for error
                .addTextDisplayComponents(new TextDisplayBuilder().setContent(content));

            return interaction.reply({ components: [notRegisteredContainer], ephemeral: true, flags: [MessageFlags.IsComponentsV2] });
        }

        const { level, xp, ci_tokens } = userProfile;

        const xpForCurrentLevel = getCumulativeXpForLevel(level);
        const xpForNextLevel = getCumulativeXpForLevel(level + 1);

        const xpInCurrentLevel = xp - xpForCurrentLevel;
        const xpNeededForLevelUp = xpForNextLevel - xpForCurrentLevel;

        const progressPercentage = Math.floor((xpInCurrentLevel / xpNeededForLevelUp) * 100);
        const progressBar = createProgressBar(xpInCurrentLevel, xpNeededForLevelUp);

        const profileCard = new ContainerBuilder()
            .setAccentColor(0x0099FF)
            .addTextDisplayComponents(
                new TextDisplayBuilder().setContent(`**Operative Profile: ${targetUser.username}**`),
                new TextDisplayBuilder().setContent(`**Level:** ${level}`),
                new TextDisplayBuilder().setContent(`**CI Tokens:** ${ci_tokens} 🪙`)
            )
            .addSeparatorComponents(new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true))
            .addTextDisplayComponents(
                new TextDisplayBuilder().setContent(`**XP Progress:** ${xp.toFixed(2)} / ${xpForNextLevel.toFixed(2)} Total XP`),
                new TextDisplayBuilder().setContent(`${progressBar} (${progressPercentage}%)`)
            );

        await interaction.reply({ components: [profileCard], flags: [MessageFlags.IsComponentsV2] });
    },
};