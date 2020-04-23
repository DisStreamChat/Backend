const discord = require("discord.js")
const tmi = require("tmi.js")
require("dotenv").config()

const fs = require("fs")
const path = require("path")

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

    // Strip off mentions, links and backticks because backticks act weird on twitch
    const messageBody = msg.content
                        .replace(mentionRegex, "")
                        .replace(urlRegex, "<link>")
                        .replace(codeRegex, "")


    // TODO add getting mention username, currently just strips mentions
    // const mentions = (mentionRegex.exec(msg.content) || []).slice(1)

    if(messageBody.length > 500){
        return await msg.channel.send(`The Twitch chat Character max is 500, your message is ${messageBody.length} characters long. please shorten your message`)
    }
    
    if (msg.channel.id === guildConfig.livechatId && messageBody.length > 0){
       await Twitchclient.say(guildConfig.twitch, `${senderName} on discord says: ${messageBody}`);
    }
})