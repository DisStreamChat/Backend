import dotenv from "dotenv";
import { credential, initializeApp } from "firebase-admin";

import { io, server } from "./app";
import DiscordEvents from "./Discord/DiscordEvents";
import { sockets } from "./Sockets";
import TwitchEvents from "./Twitch/TwitchEvents";
import { EnvManager } from "./utils/envManager.util";
import { log } from "./utils/functions/logging";
import { clientManager } from "./utils/initClients";

dotenv.config();

try {
	// initialze the firebase admin api, this is used for generating a custom token for twitch auth with firebase
	initializeApp({
		credential: credential.cert(EnvManager.GOOGLE_SERVICE_ACCOUNT_JSON),
	});
} catch (err) {}

TwitchEvents(clientManager.twitchClient);

DiscordEvents(clientManager.discordClient);
if (EnvManager.BOT_DEV) {
	clientManager.customBots.forEach(bot => {
		DiscordEvents(bot);
	});
}

sockets(io);

const port = EnvManager.PORT;

server.listen(port, () => {
	log(`listening on port ${port}`, { writeToConsole: true });
});

process.on("uncaughtException", async error => {
	await log(`Oh my god, something terrible happened: ${error}`, {
		DM: true,
		writeToConsole: true,
	});

	process.exit(1); // exit application
});
