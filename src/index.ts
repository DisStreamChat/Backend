import dotenv from "dotenv";
dotenv.config();
import TwitchEvents from "./Twitch/TwitchEvents";
import DiscordEvents from "./Discord/DiscordEvents";
import { log } from "./utils/functions/logging";
import { sockets } from "./Sockets";
import { discordClient, twitchClient, customBots } from "./utils/initClients";
import { initializeApp, credential, firestore } from "firebase-admin";
import { io, server, app } from "./app";
import { config } from "./utils/env";

////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// SETUP
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

try {
	// get the serviceAccount details from the base64 string stored in environment variables
	const serviceAccount = JSON.parse(Buffer.from(config.GOOGLE_CONFIG_BASE64, "base64").toString("ascii"));

	initializeApp({
		credential: credential.cert(serviceAccount),
	});
	firestore().settings({ ignoreUndefinedProperties: true });
} catch (err) {}

////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// TWITCH
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

// see ./TwitchEvents.js
TwitchEvents(twitchClient, io, app);

////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// DISCORD
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

// see ./DiscordEvents.js
DiscordEvents(discordClient, io);
if (!config.BOT_DEV) {
	customBots.then(bots => {
		for (const bot of bots.values()) {
			DiscordEvents(bot, io);
		}
	});
}

////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// SOCKET CONNECTION HANDLING
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
log(`Bot Dev: ${config.BOT_DEV}`, { writeToConsole: true });
sockets(io);

app.use((req, res) => {
	res.status(404).json({
		status: 404,
		message: "Page Not Found",
	});
});

const port = config.PORT || 3200;

server.listen(port, () => {
	log(`listening on port ${port}`, { writeToConsole: true });
});

process.on("uncaughtException", async error => {
	await log(`Oh my god, something terrible happened: ${error}`, { DM: true, writeToConsole: true });

	process.exit(1); // exit application
});
