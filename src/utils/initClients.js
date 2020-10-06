require("dotenv").config();
const discord = require("discord.js");
const tmi = require("tmi.js");
const { hoursToMillis } = require("./functions");
const path = require("path")
const fs = require("fs")
const eventPath = path.join(__dirname, "../Discord/Events");
const eventFiles = fs.readdirSync(eventPath);
const events = {};

// TODO: use WalkSync to allow for nested folders in command directory


// initialize the discord client
const DiscordClient = new discord.Client({ partials: ["MESSAGE", "CHANNEL", "REACTION"] });
DiscordClient.login(process.env.BOT_TOKEN);

DiscordClient.on("ready", async () => {
	console.log("bot ready");
	DiscordClient.user.setPresence({
		status: "online",
		activity: { type: "WATCHING", name: `🔴 Live Chat in ${DiscordClient.guilds.cache.array().length} servers` },
	});
	setInterval(() => {
		DiscordClient.user.setPresence({
			status: "online",
			activity: { type: "WATCHING", name: `🔴 Live Chat in ${DiscordClient.guilds.cache.array().length} servers` },
		});
	}, hoursToMillis(1));
});

// eventFiles.forEach(event => {
// 	if (event.endsWith(".js")) {
// 		const eventHandler = require(path.join(eventPath, event));
// 		DiscordClient.on(event.slice(0, -3), eventHandler)
// 	}
// });

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
