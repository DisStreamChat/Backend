const prettyMs = require("pretty-ms");
const fetch = require("node-fetch")

module.exports = {
	name: "uptime",
	aliases: ["up"],
    description: "Get the bots uptime",
    execute: async (message, args, client, streamerName) => {
        const response = await fetch(`https://api.disstreamchat.com/stats/twitch/?name=ayezee`)
        const streamInfo = await response.json()
        if(!streamInfo) return await client.say(streamerName, `${streamerName} is currently offline`)
        const timeDif = Math.abs(new Date() - new Date(streamInfo.started_at))
        await client.say(streamerName, `${streamerName} has been streaming for ${prettyMs(timeDif)}`)
    }
}