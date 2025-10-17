const { SlashCommandBuilder, ContainerBuilder, TextDisplayBuilder, MessageFlags, AttachmentBuilder, FileBuilder } = require('discord.js');
const { getUserProfile, readUserDb } = require('../utils/database');
const { getCumulativeXpForLevel } = require('../utils/xpUtils');
const { generateRankCard } = require('../utils/rankCardGenerator');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('profile')
        .setDescription("Displays your current monthly stats on the Apex Grid.")
        .addUserOption(option =>
            option.setName('user')
                .setDescription('The user whose profile you want to see.')
                .setRequired(false)),
    async execute(interaction) {
        await interaction.deferReply();
        const targetUser = interaction.options.getUser('user') || interaction.user;
        const userProfile = getUserProfile(interaction.guild.id, targetUser.id);

        if (!userProfile) {
            const content = targetUser.id === interaction.user.id
                ? "You are not yet registered on the Apex Grid. Use any command to start the tutorial!"
                : "This user is not yet registered on the Apex Grid.";

            const notRegisteredContainer = new ContainerBuilder()
                .setAccentColor(0xFF0000) // Red for error
                .addTextDisplayComponents(new TextDisplayBuilder().setContent(content));

            return interaction.editReply({ components: [notRegisteredContainer], flags: [MessageFlags.IsComponentsV2] });
        }

        // Get rank
        const allUsers = readUserDb()[interaction.guild.id];
        const sortedUsers = Object.entries(allUsers).sort(([, a], [, b]) => b.xp - a.xp);
        const rank = sortedUsers.findIndex(([id]) => id === targetUser.id) + 1;

        const { level, xp } = userProfile;
        const xpForCurrentLevel = getCumulativeXpForLevel(level);
        const xpForNextLevel = getCumulativeXpForLevel(level + 1);

        const imageBuffer = await generateRankCard({
            username: targetUser.username,
            discriminator: targetUser.discriminator,
            level: level,
            rank: rank,
            currentXp: xp - xpForCurrentLevel,
            requiredXp: xpForNextLevel - xpForCurrentLevel,
            avatarUrl: targetUser.displayAvatarURL({ extension: 'png', size: 256 }),
            status: 'online' // In a real bot, you'd get this from presence
        });

        const attachment = new AttachmentBuilder(imageBuffer, { name: 'rank-card.png' });

        const fileComponent = new FileBuilder()
            .setURL('attachment://rank-card.png');

        const container = new ContainerBuilder()
            .addFileComponents(fileComponent);

        await interaction.editReply({ files: [attachment], components: [container], flags: [MessageFlags.IsComponentsV2] });
    },
};