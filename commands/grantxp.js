const { SlashCommandBuilder, PermissionFlagsBits, ContainerBuilder, TextDisplayBuilder, MessageFlags } = require('discord.js');
const { getUserProfile, updateUserProfile } = require('../utils/database');
const { getLevelForXp } = require('../utils/xpUtils');
const chalk = require('chalk');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('grantxp')
        .setDescription('[Admin] Grants a specified amount of XP to a user.')
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
        .addUserOption(option =>
            option.setName('user')
                .setDescription('The user to grant XP to.')
                .setRequired(true))
        .addIntegerOption(option =>
            option.setName('amount')
                .setDescription('The amount of XP to grant.')
                .setRequired(true)
                .setMinValue(1)),
    async execute(interaction) {
        const targetUser = interaction.options.getUser('user');
        const amount = interaction.options.getInteger('amount');
        const userProfile = getUserProfile(interaction.guild.id, targetUser.id);

        if (!userProfile) {
            const notRegisteredContainer = new ContainerBuilder()
                .setAccentColor(0xFF0000)
                .addTextDisplayComponents(new TextDisplayBuilder().setContent(`**Error:** This user is not registered on the Apex Grid. They must use a command first.`));
            return interaction.reply({ components: [notRegisteredContainer], ephemeral: true, flags: [MessageFlags.IsComponentsV2] });
        }

        const oldLevel = userProfile.level;
        const newTotalXp = userProfile.xp + amount;
        const newLevel = getLevelForXp(newTotalXp);

        let ciGained = 0;
        if (newLevel > oldLevel) {
            // Calculate CI tokens for the levels gained
            for (let levelReached = oldLevel + 1; levelReached <= newLevel; levelReached++) {
                ciGained += (1 + (0.5 * (levelReached - 1)));
            }
        }
        // Note: The daily cap is intentionally ignored for admin grants as per typical bot design for event prizes.

        const newCiTotal = userProfile.ci_tokens + ciGained;

        updateUserProfile(interaction.guild.id, targetUser.id, {
            xp: newTotalXp,
            level: newLevel,
            ci_tokens: newCiTotal,
        });

        console.log(chalk.magenta(`[ADMIN] ${interaction.user.tag} granted ${amount} XP to ${targetUser.tag}.`));

        const successContainer = new ContainerBuilder()
            .setAccentColor(0x57F287)
            .addTextDisplayComponents(
                new TextDisplayBuilder().setContent(`**Success!**`),
                new TextDisplayBuilder().setContent(`Granted **${amount} XP** to ${targetUser.username}.`),
                new TextDisplayBuilder().setContent(`They are now Level **${newLevel}** with a total of **${newCiTotal} CI Tokens**.`)
            );

        await interaction.reply({ components: [successContainer], ephemeral: true, flags: [MessageFlags.IsComponentsV2] });
    },
};