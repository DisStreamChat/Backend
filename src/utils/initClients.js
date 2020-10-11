require("dotenv").config();
const discord = require("discord.js");
const tmi = require("tmi.js");
const { hoursToMillis } = require("./functions");
const path = require("path");
const fs = require("fs");
const eventPath = path.join(__dirname, "../Discord/Events");
const eventFiles = fs.readdirSync(eventPath);
const events = {};

// TODO: use WalkSync to allow for nested folders in command directory

// initialize the discord client
const DiscordClient = new discord.Client({ partials: ["MESSAGE", "CHANNEL", "REACTION"] });
DiscordClient.login(process.env.BOT_TOKEN);

let serverLength = 0;
let serverPresence = true;

DiscordClient.on("ready", async () => {
	console.log("bot ready");
	serverLength = DiscordClient.guilds.cache.array().length;
	DiscordClient.user.setPresence({
		status: "online",
		activity: { type: "WATCHING", name: `🔴 Live Chat in ${serverLength} servers` },
	});
	setInterval(() => {
		if (serverPresence) {
			DiscordClient.user.setPresence({
				status: "online",
				activity: { type: "WATCHING", name: `🔴 Live Chat in ${serverLength} servers` },
			});
		} else {
			DiscordClient.user.setPresence({
				status: "online",
				activity: { type: "WATCHING", name: `@${DiscordClient.user.name} help` },
			});
		}
		serverPresence = !serverPresence;
    }, 300000);
    setInterval(() => {
        serverLength = DiscordClient.guilds.cache.array().length;
    }, hoursToMillis(.25));
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
