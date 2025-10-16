const { SlashCommandBuilder, PermissionFlagsBits, ContainerBuilder, TextDisplayBuilder, MessageFlags } = require('discord.js');
const { getUserProfile, updateUserProfile } = require('../utils/database');
const { processLevelUp } = require('../utils/levelUp');
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

        const updatedStats = processLevelUp(userProfile, amount);
        updateUserProfile(interaction.guild.id, targetUser.id, updatedStats);

        console.log(chalk.magenta(`[ADMIN] ${interaction.user.tag} granted ${amount} XP to ${targetUser.tag}.`));

        const successContainer = new ContainerBuilder()
            .setAccentColor(0x57F287)
            .addTextDisplayComponents(
                new TextDisplayBuilder().setContent(`**Success!**`),
                new TextDisplayBuilder().setContent(`Granted **${amount} XP** to ${targetUser.username}.`),
                new TextDisplayBuilder().setContent(`They are now Level **${updatedStats.level}** with a total of **${updatedStats.ci_tokens.toFixed(2)} CI Tokens**.`)
            );

        await interaction.reply({ components: [successContainer], ephemeral: true, flags: [MessageFlags.IsComponentsV2] });
    },
};