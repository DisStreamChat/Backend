const discord = require("discord.js")
const tmi = require("tmi.js")
require("dotenv").config()

const fs = require("fs")
const path = require("path")

const AntiSpam = require('discord-anti-spam');
const antiSpam = new AntiSpam({
    warnThreshold: 3, // Amount of messages sent in a row that will cause a warning.
    kickThreshold: 7, // Amount of messages sent in a row that will cause a ban.
    banThreshold: 15, // Amount of messages sent in a row that will cause a ban.
    maxInterval: 2000, // Amount of time (in milliseconds) in which messages are considered spam.
    warnMessage: '{@user}, Please stop spamming.', // Message that will be sent in chat upon warning a user.
    kickMessage: '**{user_tag}** has been kicked for spamming.', // Message that will be sent in chat upon kicking a user.
    banMessage: '**{user_tag}** has been banned for spamming.', // Message that will be sent in chat upon banning a user.
    maxDuplicatesWarning: 2, // Amount of duplicate messages that trigger a warning.
    maxDuplicatesKick: 10, // Amount of duplicate messages that trigger a kick.
    maxDuplicatesBan: 12, // Amount of duplicate messages that trigger a ban.
    exemptPermissions: ['ADMINISTRATOR', "MANAGE SERVER"], // Bypass users with any of these permissions.
    ignoreBots: true, // Ignore bot messages.
    verbose: true, // Extended Logs from module.
    ignoredUsers: [], // Array of User IDs that get ignored.
});


const configFile = require("../config.json")
// const configPath = path.join(__dirname, "..", "..", "config.json")

const DiscordClient = new discord.Client({ partials: ['MESSAGE', 'CHANNEL', 'REACTION'] })

// DiscordClient.config = require("../config.json")
// DiscordClient.commands = new discord.Collection()

const allChannels = (Object.entries(configFile.channels).map(([id, info]) => info.twitch.slice(1)))

// TODO: fix
const Twitchclient = new tmi.Client({
    options: { debug: true },
    connection: {
        secure: true,
        reconnect: true
    },
    identity: {
        username: 'distwitchchat', 
        password: process.env.TWITH_OAUTH_TOKEN
    },
    channels: allChannels
});

Twitchclient.connect();

// TODO add uptime command to twitch side of bot
// Twitchclient.on('message', (channel, tags, message, self) => {
//     // Ignore echoed messages.
//     if (self) return;

//     if (message.toLowerCase() === '!hello') {
//         // "@alca, heya!"
//         console.log(channel)
//         Twitchclient.say(channel, `@${tags.username}, heya!`);
//     }
// });

DiscordClient.once("ready", async () => {
    console.log("bot ready")
    console.log(`Logged in as ${DiscordClient.user.tag}.`)
    // loadCommands(DiscordClient)
})

DiscordClient.login(process.env.BOT_TOKEN) 

const mentionRegex = /<@[\W\S]([\d]+)>/gm
const urlRegex = /^(http:\/\/www\.|https:\/\/www\.|http:\/\/|https:\/\/)?[a-z0-9]+([\-\.]{1}[a-z0-9]+)*\.[a-z]{2,5}(:[0-9]{1,5})?(\/.*)?$/gm

DiscordClient.on("message", async msg => {
    if(msg.author.bot) return

    
    const senderName = msg.member.displayName
    const guildConfig = configFile.channels[msg.guild.id]
    const codeRegex = /[`]{1,3}[\w]*/gm
    const customEmojiRegex = /<:([\w]+):[\d]+>/gm
    
    
    // Strip off mentions, backticks because backticks act weird on twitch
    const messageBody = msg.content
    .replace(mentionRegex, "")
    .replace(codeRegex, "")
    .replace(customEmojiRegex, ":$1:")
    
    
    // TODO add getting mention username, currently just strips mentions
    // const mentions = (mentionRegex.exec(msg.content) || []).slice(1)
    
    // TODO add in a way to send the name of custom emojis because you can't send thme directly
    
    
    if(messageBody.length > 500){
        return await msg.channel.send(`The Twitch chat Character max is 500, your message is ${messageBody.length} characters long. please shorten your message`)
    }
    
    if (msg.channel.id === guildConfig.livechatId && messageBody.length > 0){
        antiSpam.message(msg)
        await Twitchclient.say(guildConfig.twitch, `${senderName} on discord says: ${messageBody}`);
    }
})