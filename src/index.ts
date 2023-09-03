import dotenv from "dotenv";
import { credential, initializeApp } from "firebase-admin";

import { app, io, server } from "./app";
import DiscordEvents from "./Discord/DiscordEvents";
import { sockets } from "./Sockets";
import TwitchEvents from "./Twitch/TwitchEvents";
import { log } from "./utils/functions/logging";
import { clientManager } from "./utils/initClients";

dotenv.config();
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// SETUP
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

try {
	// get the serviceAccount details from the base64 string stored in environment variables
	const serviceAccount = JSON.parse(Buffer.from(process.env.GOOGLE_CONFIG_BASE64, "base64").toString("ascii"));

	// initialze the firebase admin api, this is used for generating a custom token for twitch auth with firebase
	initializeApp({
		credential: credential.cert(serviceAccount),
	});
} catch (err) {}

////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// TWITCH
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

// see ./TwitchEvents.js
TwitchEvents(clientManager.twitchClient, io, app);

////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// DISCORD
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

// see ./DiscordEvents.js
DiscordEvents(clientManager.discordClient, io);
if (process.env.BOT_DEV != "true") {
	clientManager.customBots.forEach(bot => {
		DiscordEvents(bot, io);
	});
}

////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// SOCKET CONNECTION HANDLING
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
log(`Bot Dev: ${process.env.BOT_DEV}`, { writeToConsole: true });
sockets(io);

app.use((req, res) => {
	res.status(404).json({
		status: 404,
		message: "Page Not Found",
	});
});

const port = process.env.PORT || 3200;

server.listen(port, () => {
	log(`listening on port ${port}`, { writeToConsole: true });
});

process.on("uncaughtException", async error => {
	await log(`Oh my god, something terrible happened: ${error}`, { DM: true, writeToConsole: true });

	process.exit(1); // exit application
});
