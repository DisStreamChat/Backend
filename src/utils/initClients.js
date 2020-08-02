require("dotenv").config()
const discord = require("discord.js");
const tmi = require("tmi.js");
const { hoursToMillis } = require("./functions");

// initialize the discord client
const DiscordClient = new discord.Client({ partials: ["MESSAGE", "CHANNEL", "REACTION"] });
DiscordClient.login(process.env.BOT_TOKEN);

DiscordClient.on("ready", async () => {
	console.log("bot ready");
	DiscordClient.user.setPresence({ status: "online", activity: { type: "WATCHING", name: `🔴 Live Chat in ${DiscordClient.guilds.cache.array().length} servers` } });
    setInterval(() => {
        DiscordClient.user.setPresence({ status: "online", activity: { type: "WATCHING", name: `🔴 Live Chat in ${DiscordClient.guilds.cache.array().length} servers` } });
    }, hoursToMillis(1))
});

// initialize the twitch client
const TwitchClient = new tmi.Client({
	options: { debug: process.env.TWITCH_DEBUG == "true" },
	connection: {
		// server: "irc.fdgt.dev",
		secure: true,
		reconnect: true,
	},
	identity: {
		username: "distwitchchat",
		password: process.env.TWITH_OAUTH_TOKEN,
	},
	channels: [process.env.DEBUG_CHANNEL || ""],
});
TwitchClient.connect();


module.exports = {
	DiscordClient,
	TwitchClient,
};
