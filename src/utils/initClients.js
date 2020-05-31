const discord = require("discord.js")
const tmi = require("tmi.js")

// initialize the discord client
const DiscordClient = new discord.Client({ partials: ['MESSAGE', 'CHANNEL', 'REACTION'] })
DiscordClient.login(process.env.BOT_TOKEN)

DiscordClient.once("ready", async () => {
    console.log("bot ready")
    DiscordClient.user.setPresence({ status: "online", activity: { type: "WATCHING", name: "🔴 Live Chat" } })
})

// initialize the twitch client
const TwitchClient = new tmi.Client({
    options: { debug: process.env.TWITCH_DEBUG == "true" },
    connection: {
        secure: true,
        reconnect: true
    },
    identity: {
        username: 'distwitchchat',
        password: process.env.TWITH_OAUTH_TOKEN
    },
    channels: [process.env.DEBUG_CHANNEL || ""]
})
TwitchClient.connect()

module.exports = {
    DiscordClient,
    TwitchClient
}