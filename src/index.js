const discord = require("discord.js")
const tmi = require("tmi.js")
require("dotenv").config()

const fs = require("fs")
const path = require("path")

// const configPath = path.join(__dirname, "..", "..", "config.json")

const DiscordClient = new discord.Client({ partials: ['MESSAGE', 'CHANNEL', 'REACTION'] })
// DiscordClient.config = require("../config.json")
// DiscordClient.commands = new discord.Collection()


// const Twitchclient = new tmi.Client({
//     options: { debug: true },
//     connection: {
//         secure: true,
//         reconnect: true
//     },
//     identity: {
//         username: 'DisTwitchChat', 
//         password: process.env.TWITH_OAUTH_TOKEN
//     },
//     channels: ['dav1dsnyder404']
// });

// Twitchclient.connect();

// Twitchclient.on('message', (channel, tags, message, self) => {
//     // Ignore echoed messages.
//     if (self) return;

//     if (message.toLowerCase() === '!hello') {
//         // "@alca, heya!"
//         client.say(channel, `@${tags.username}, heya!`);
//     }
// });

DiscordClient.once("ready", async () => {
    console.log("bot ready")
    // loadCommands(DiscordClient)
})

DiscordClient.login(process.env.BOT_TOKEN) 