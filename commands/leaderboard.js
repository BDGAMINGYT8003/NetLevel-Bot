const { SlashCommandBuilder, ContainerBuilder, TextDisplayBuilder, MessageFlags } = require('discord.js');
const { getGuildUsers } = require('../utils/database');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('leaderboard')
        .setDescription('Displays the monthly Apex Grid XP leaderboard.'),

    async execute(interaction) {
        const guildId = interaction.guild.id;
        const guildUsers = getGuildUsers(guildId);

        if (!guildUsers || Object.keys(guildUsers).length === 0) {
            await interaction.reply({ content: 'There is no leaderboard data for this server yet.', ephemeral: true });
            return;
        }

        // Convert to array, sort by XP, and take top 10
        const sortedUsers = Object.values(guildUsers)
            .sort((a, b) => b.xp - a.xp)
            .slice(0, 10);

        if (sortedUsers.length === 0) {
            await interaction.reply({ content: 'There is no leaderboard data for this server yet.', ephemeral: true });
            return;
        }

        let leaderboardContent = `**🏆 Apex Grid Monthly Leaderboard for ${interaction.guild.name}**\n\n`;

        for (let i = 0; i < sortedUsers.length; i++) {
            const userEntry = sortedUsers[i];
            const user = await interaction.client.users.fetch(userEntry.id).catch(() => ({ username: 'Unknown User' }));
            const rank = i + 1;
            const medal = rank === 1 ? '🥇' : rank === 2 ? '🥈' : rank === 3 ? '🥉' : `#${rank}`;

            leaderboardContent += `${medal} **${user.username}** - Level ${userEntry.level} | ${userEntry.xp.toFixed(0)} XP\n`;
        }

        const leaderboardContainer = new ContainerBuilder()
            .setAccentColor(0xFFA500) // Orange accent
            .addTextDisplayComponents(
                new TextDisplayBuilder().setContent(leaderboardContent)
            );

        await interaction.reply({
            components: [leaderboardContainer],
            flags: MessageFlags.IsComponentsV2,
        });
    },
};