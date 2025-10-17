const { SlashCommandBuilder, ContainerBuilder, TextDisplayBuilder, MessageFlags } = require('discord.js');
const { readUserDb } = require('../utils/database');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('leaderboard')
        .setDescription('Displays the monthly XP leaderboard.'),
    async execute(interaction) {
        const { guild } = interaction;
        const allUsers = readUserDb();
        const guildUsers = allUsers[guild.id];

        if (!guildUsers || Object.keys(guildUsers).length === 0) {
            const noUsersContainer = new ContainerBuilder()
                .setAccentColor(0xFF0000)
                .addTextDisplayComponents(new TextDisplayBuilder().setContent("There are no ranked operatives in this server yet."));
            return interaction.reply({ components: [noUsersContainer], ephemeral: true, flags: [MessageFlags.IsComponentsV2] });
        }

        const sortedUsers = Object.entries(guildUsers)
            .filter(([_, user]) => user.onboarded)
            .sort(([, a], [, b]) => b.xp - a.xp)
            .slice(0, 10); // Top 10

        if (sortedUsers.length === 0) {
            const noUsersContainer = new ContainerBuilder()
                .setAccentColor(0xFF0000)
                .addTextDisplayComponents(new TextDisplayBuilder().setContent("There are no ranked operatives in this server yet."));
            return interaction.reply({ components: [noUsersContainer], ephemeral: true, flags: [MessageFlags.IsComponentsV2] });
        }

        const leaderboardText = await Promise.all(sortedUsers.map(async ([userId, data], index) => {
            try {
                const user = await interaction.client.users.fetch(userId);
                return `${index + 1}. **${user.username}** - Level ${data.level} (${data.xp.toFixed(2)} XP)`;
            } catch {
                return `${index + 1}. *Unknown User* - Level ${data.level} (${data.xp.toFixed(2)} XP)`;
            }
        }));

        const userRank = sortedUsers.findIndex(([userId]) => userId === interaction.user.id) + 1;
        const userRankText = userRank > 0 ? `\n\nYour Rank: **#${userRank}**` : "\n\nYou are not yet ranked.";

        const leaderboardContainer = new ContainerBuilder()
            .setAccentColor(0xFFD700) // Gold for leaderboard
            .addTextDisplayComponents(
                new TextDisplayBuilder().setContent(`**🏆 Monthly XP Leaderboard - Top ${sortedUsers.length} 🏆**`),
                new TextDisplayBuilder().setContent((leaderboardText.join('\n') || "No users to display.") + userRankText)
            );

        await interaction.reply({ components: [leaderboardContainer], flags: [MessageFlags.IsComponentsV2] });
    },
};