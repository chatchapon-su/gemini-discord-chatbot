const { Client, GatewayIntentBits } = require('discord.js');
const { REST } = require('@discordjs/rest');
const { Routes } = require('discord-api-types/v9');
const axios = require('axios');

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.DirectMessages,
    GatewayIntentBits.GuildMessageTyping,
  ]
});


const DISCORD_TOKEN = 'your discord bot token';
const GEMINI_API_KEY = 'your gemini key';

const chatStatus = {};

async function getGeminiResponse(messageContent) {
  const prompt = "Setting your prompt";

  try {
    const response = await axios.post(
      'https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent?key=' + GEMINI_API_KEY,
      {
        contents: [
          {
            parts: [
              {
                text: `${prompt}\nUser: ${messageContent}\nAssistant:`
              }
            ]
          }
        ]
      },
      {
        headers: {
          'Content-Type': 'application/json',
        },
      }
    );

    if (response.data && response.data.candidates && response.data.candidates.length > 0) {
      const candidate = response.data.candidates[0];
      if (candidate && candidate.content && candidate.content.parts && candidate.content.parts.length > 0) {
        return candidate.content.parts[0].text.trim();
      } else {
        console.error('No content found in candidates:', candidate);
        return 'ขออภัยค่ะ ฉันไม่สามารถตอบคำถามนี้ของคุณได้';
      }
    } else {
      console.error('No generated content found in response:', response.data);
      return 'ขออภัยค่ะ ฉันไม่สามารถตอบคำถามนี้ของคุณได้';
    }
  } catch (error) {
    console.error('Error:', error.response ? error.response.data : error.message);
    return 'ขออภัยค่ะ ฉันไม่สามารถตอบคำถามนี้ของคุณได้';
  }
}

client.once('ready', async () => {
  console.log(`Logged in as ${client.user.tag}!`);
  await registerCommands();
});

async function registerCommands() {
  const commands = [
    {
      name: 'speak',
      description: 'อนุญาตให้บอทพูดคุย',
    },
    {
      name: 'stop',
      description: 'หยุดการพูดคุยของบอท',
    },
  ];

  const rest = new REST({ version: '9' }).setToken(DISCORD_TOKEN);

  try {
    console.log('Started refreshing application (/) commands.');
    await rest.put(Routes.applicationCommands(client.user.id), { body: commands });
    console.log('Successfully reloaded application (/) commands.');
  } catch (error) {
    console.error(error);
  }
}

client.on('interactionCreate', async (interaction) => {
  if (!interaction.isCommand()) return;

  const { commandName } = interaction;

  try{
    if (commandName === 'speak') {
      chatStatus[interaction.channel.id] = true;
      await interaction.reply('ตอนนี้บอทสามารถพูดคุยได้แล้ว!');
    } else if (commandName === 'stop') {
      chatStatus[interaction.channel.id] = false;
      await interaction.reply('ตอนนี้บอทหยุดพูดคุยแล้ว!');
    }
  } catch (error) {
    console.error("Error processing command:", error);
    await interaction.reply("ขออภัยค่ะ ขณะนี้ไม่พร้อมใช้งานในโหมดนี้");
  }
  
});

function splitMessage(message, maxLength = 2000) {
  if (message.length <= maxLength) return [message];

  const messages = [];
  let start = 0;

  while (start < message.length) {
    let end = start + maxLength;

    if (end < message.length) {
      const lastSpace = message.lastIndexOf(' ', end);
      if (lastSpace > start) end = lastSpace;
    }

    messages.push(message.slice(start, end));
    start = end + 1;
  }

  return messages;
}

client.on('messageCreate', async message => {
  try {
    if (message.author.bot) return;

    const chatId = message.channel.id;

    if (chatStatus[chatId]) {
      const geminiResponse = await getGeminiResponse(message.content);

      const responses = splitMessage(geminiResponse);

      for (const response of responses) {
        await message.channel.send(response);
      }
    }
  } catch (error) {
    console.error("Error processing message:", error);
    await message.reply("ขออภัยค่ะ เกิดข้อผิดพลาดในการประมวลผลข้อความ");
  }
});

client.login(DISCORD_TOKEN);