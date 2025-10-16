const { ContainerBuilder, TextDisplayBuilder, ButtonBuilder, ButtonStyle, MessageFlags } = require('discord.js');
const { createUser, getUser } = require('./database');

async function checkAndOnboardUser(interaction) {
    const guildId = interaction.guild.id;
    const userId = interaction.user.id;

    const user = getUser(guildId, userId);

    // If user exists and is onboarded, continue with the command
    if (user && user.onboarded) {
        return true;
    }

    // --- Start Onboarding Tutorial ---
    await interaction.reply({
        content: 'Welcome to the Apex Grid! It seems you are new here. Let\'s get you started.',
        ephemeral: true
    });

    // Tutorial Step 1: Intro
    const step1 = new ContainerBuilder()
        .setAccentColor(0x5865F2)
        .addTextDisplayComponents(
            new TextDisplayBuilder().setContent('**Welcome, Contractor!**\n\nThis server uses a unique monthly economic system called the **Apex Grid**. Your activity here earns you status and currency to redeem for in-game rewards.')
        )
        .addActionRowComponents(row => row.addComponents(new ButtonBuilder().setCustomId('tutorial_next_1').setLabel('Next').setStyle(ButtonStyle.Primary)));

    await interaction.editReply({
        content: '',
        components: [step1],
        flags: MessageFlags.IsComponentsV2
    });

    // Wait for the 'Next' button click
    const filter = i => i.customId.startsWith('tutorial_next_') && i.user.id === interaction.user.id;
    const collector = interaction.channel.createMessageComponentCollector({ filter, time: 60000 });

    collector.on('collect', async i => {
        await i.deferUpdate();

        if (i.customId === 'tutorial_next_1') {
            // Tutorial Step 2: Dual Currency
            const step2 = new ContainerBuilder()
                .setAccentColor(0x5865F2)
                .addTextDisplayComponents(
                    new TextDisplayBuilder().setContent('**Dual Currency System**\n\n- **Server XP**: Earned by chatting. Increases your Level and rank on the monthly `/leaderboard`. Resets monthly.\n- **CI Tokens**: Earned only when you level up. This is the currency you spend at the `/market`. Resets monthly.')
                )
                .addActionRowComponents(row => row.addComponents(new ButtonBuilder().setCustomId('tutorial_next_2').setLabel('Next').setStyle(ButtonStyle.Primary)));

            await interaction.editReply({ components: [step2], flags: MessageFlags.IsComponentsV2 });
        } else if (i.customId === 'tutorial_next_2') {
            // Tutorial Step 3: Market & Profile
            const step3 = new ContainerBuilder()
                .setAccentColor(0x5865F2)
                .addTextDisplayComponents(
                    new TextDisplayBuilder().setContent('**The Apex Market & Your Profile**\n\n- Use the `/market` command to spend your CI Tokens on valuable items. Your personal stock for each item also resets monthly.\n- Check your progress with the `/profile` command. It shows your Level, XP, and CI balance.')
                )
                .addActionRowComponents(row => row.addComponents(new ButtonBuilder().setCustomId('tutorial_finish').setLabel('Got it!').setStyle(ButtonStyle.Success)));

            await interaction.editReply({ components: [step3], flags: MessageFlags.IsComponentsV2 });
        } else if (i.customId === 'tutorial_finish') {
            // Final Step: Create user and confirm
            createUser(guildId, userId);

            const finalStep = new ContainerBuilder()
                .setAccentColor(0x57F287)
                .addTextDisplayComponents(
                    new TextDisplayBuilder().setContent('**You are all set!**\n\nYour Apex Grid profile has been created. You can now use all bot commands.\n\nTry running the command you just attempted again!')
                );

            await interaction.editReply({ components: [finalStep], flags: MessageFlags.IsComponentsV2 });
            collector.stop();
        }
    });

    collector.on('end', collected => {
        if (collected.size === 0) {
            interaction.editReply({ content: 'Tutorial timed out. Please try running a command again to restart.', components: [] }).catch(() => {});
        }
    });

    // Halt the original command execution
    return false;
}

module.exports = { checkAndOnboardUser };