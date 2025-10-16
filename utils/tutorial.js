const { ContainerBuilder, TextDisplayBuilder, ButtonBuilder, ButtonStyle, MessageFlags, ActionRowBuilder } = require('discord.js');
const { updateUserProfile } = require('./database');

const tutorialSteps = [
    {
        title: "Welcome to the Apex Grid!",
        content: "Welcome, Operative. You've just interfaced with the Apex Grid, your hub for monthly progression and rewards within this server.\n\nThis is a one-time briefing to get you mission-ready. Click 'Next' to continue.",
        buttonLabel: "Next"
    },
    {
        title: "Dual-Currency System",
        content: "You'll manage two resources:\n\n**1. Server XP & Levels:** Earned by chatting and engaging. This determines your rank on the monthly leaderboard and unlocks Market Tiers.\n\n**2. Calamity Intel (CI) Tokens:** Awarded *only* when you level up. Use these to acquire valuable assets from the `/market`.",
        buttonLabel: "Next"
    },
    {
        title: "The Monthly Reset",
        content: "The Apex Grid operates in monthly cycles. On the 1st of every month at 00:00 UTC, all **XP, Levels, CI Tokens, and Market Item Stock** are reset.\n\nTop operatives on the leaderboard will receive exclusive rewards before the reset.",
        buttonLabel: "Next"
    },
    {
        title: "Your Identity",
        content: "Use the `/profile` command at any time to check your current Level, XP progress, and CI Token balance.\n\nUse `/leaderboard` to see your standing among other operatives.",
        buttonLabel: "Got It!"
    },
    {
        title: "Briefing Complete",
        content: "Your operative profile has been created. You now have full access to the Apex Grid.\n\nGood luck.",
        buttonLabel: "Begin"
    }
];

async function startTutorial(interaction) {
    await interaction.deferUpdate(); // Acknowledge the button click from the prompt
    let currentStep = 0;

    const generateTutorialMessage = (stepIndex) => {
        const step = tutorialSteps[stepIndex];
        const container = new ContainerBuilder()
            .setAccentColor(0x0099FF)
            .addTextDisplayComponents(
                new TextDisplayBuilder().setContent(`**${step.title}**`),
                new TextDisplayBuilder().setContent(step.content)
            );

        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId(`tutorial_next_${stepIndex}`)
                .setLabel(step.buttonLabel)
                .setStyle(ButtonStyle.Primary)
        );

        return {
            components: [container, row],
            flags: [MessageFlags.IsComponentsV2],
            ephemeral: true,
        };
    };

    await interaction.editReply(generateTutorialMessage(currentStep));

    const filter = (i) => i.customId.startsWith('tutorial_next_') && i.user.id === interaction.user.id;
    const collector = interaction.channel.createMessageComponentCollector({ filter, time: 300000 }); // 5 minute timeout

    collector.on('collect', async i => {
        await i.deferUpdate();
        currentStep++;

        if (currentStep < tutorialSteps.length) {
            await i.editReply(generateTutorialMessage(currentStep));
        }

        if (currentStep >= tutorialSteps.length) {
            // This is the final click on "Begin"
            collector.stop();
            // The profile is now created *before* the tutorial starts.
            // Here, we just mark it as complete.
            updateUserProfile(interaction.guild.id, interaction.user.id, { onboarded: true });

            const finalMessage = new ContainerBuilder()
                .setAccentColor(0x57F287) // Green for success
                .addTextDisplayComponents(
                    new TextDisplayBuilder().setContent("**Onboarding Complete**"),
                    new TextDisplayBuilder().setContent("You now have full access to the Apex Grid. Please run the command you originally intended to use again.")
                );
            await i.editReply({ components: [finalMessage], flags: [MessageFlags.IsComponentsV2] });
        } else {
             await i.editReply(generateTutorialMessage(currentStep));
        }
    });

    collector.on('end', collected => {
        if (collected.size === 0) {
            interaction.editReply({ content: 'Tutorial timed out.', components: [] });
        }
    });
}

module.exports = { startTutorial };