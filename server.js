const express = require('express');
const { Client, GatewayIntentBits, ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder } = require('discord.js');
const cors = require('cors');

const app = express();
app.use(express.json());
app.use(cors());

// 👇👇👇 ЗДЕСЬ ЗАМЕНИ НА СВОИ ДАННЫЕ 👇👇👇
const DISCORD_BOT_TOKEN = 'MTQ4NzI5NDc3MzM1MzI1MDg3Ng.GuDNX2._zhH_LCKS_OuT-3yOLT4IGX7fvWi2POB6aOAKw';
const DISCORD_CHANNEL_ID = '1487294773353250876';

const bot = new Client({
    intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent]
});

const commandQueue = [];

bot.once('ready', () => {
    console.log(`✅ Бот ${bot.user.tag} запущен!`);
});

bot.on('interactionCreate', async (interaction) => {
    if (!interaction.isButton()) return;
    
    const [action, userId] = interaction.customId.split('_');
    await interaction.deferReply({ ephemeral: true });
    
    commandQueue.push({ userId: parseInt(userId), action: action, timestamp: Date.now() });
    
    const actionText = action === 'kick' ? 'кикнут' : (action === 'warn' ? 'предупрежден' : 'убит');
    await interaction.editReply(`✅ Игрок ${userId} будет ${actionText}!`);
    
    try {
        const msg = await interaction.channel.messages.fetch(interaction.message.id);
        const newEmbed = EmbedBuilder.from(msg.embeds[0]).setFooter({ text: `✅ ${action} | ${new Date().toLocaleString()}` });
        await msg.edit({ embeds: [newEmbed], components: [] });
    } catch(e) {}
});

app.post('/api/report', async (req, res) => {
    const { playerName, userId, reason, severity } = req.body;
    console.log(`📢 ${playerName} (${userId}) - ${reason}`);
    
    try {
        const channel = await bot.channels.fetch(DISCORD_CHANNEL_ID);
        const color = severity === 'слабо' ? 0xFFA500 : (severity === 'сильно' ? 0xFF5500 : 0xFF0000);
        
        const embed = new EmbedBuilder()
            .setTitle('🚨 ПОДОЗРИТЕЛЬНЫЙ ИГРОК')
            .setColor(color)
            .addFields(
                { name: 'Никнейм', value: playerName, inline: true },
                { name: 'User ID', value: userId.toString(), inline: true },
                { name: 'Причина', value: reason, inline: false },
                { name: 'Уровень', value: severity, inline: true }
            )
            .setThumbnail(`https://www.roblox.com/headshot-thumbnail/image?userId=${userId}&width=420&height=420&format=png`)
            .setTimestamp();
        
        const row = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder().setCustomId(`kick_${userId}`).setLabel('🔨 КИК').setStyle(ButtonStyle.Danger),
                new ButtonBuilder().setCustomId(`warn_${userId}`).setLabel('⚠️ ВАРН').setStyle(ButtonStyle.Primary),
                new ButtonBuilder().setCustomId(`kill_${userId}`).setLabel('💀 УБИТЬ').setStyle(ButtonStyle.Secondary)
            );
        
        await channel.send({ embeds: [embed], components: [row] });
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ success: false });
    }
});

app.get('/api/commands/:userId', (req, res) => {
    const userId = parseInt(req.params.userId);
    const playerCommands = commandQueue.filter(cmd => cmd.userId === userId);
    playerCommands.forEach(cmd => {
        const index = commandQueue.indexOf(cmd);
        if (index > -1) commandQueue.splice(index, 1);
    });
    res.json({ success: true, commands: playerCommands });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`🌐 Сервер на порту ${PORT}`);
});

bot.login(DISCORD_BOT_TOKEN);