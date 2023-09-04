import dotenv from "dotenv";
import { credential, initializeApp } from "firebase-admin";

import { io, server } from "./app";
import setupDiscordEvents from "./Discord/DiscordEvents";
import { setupSocketServer } from "./Sockets";
import setupTwitchEvents from "./Twitch/TwitchEvents";
import { EnvManager } from "./utils/envManager.util";
import { Logger } from "./utils/functions/logging";
import { clientManager } from "./utils/initClients";

dotenv.config();

try {
	initializeApp({
		credential: credential.cert(EnvManager.GOOGLE_SERVICE_ACCOUNT_JSON),
	});
} catch (err) {}
Logger.configure({ logToConsole: true, logToFile: true });

Logger.log(`setting up twitch events for the base client`, { logToConsole: true });
setupTwitchEvents(clientManager.twitchClient);

Logger.log(`setting up discord events for the base client`, { logToConsole: true });
setupDiscordEvents(clientManager.discordClient);

Logger.log(`settings up socket.io events`, { logToConsole: true });
setupSocketServer(io);

if (EnvManager.BOT_DEV) {
	Logger.log(`settings up discord events for custom bots`, { logToConsole: true });
	clientManager.customBots.forEach(bot => {
		setupDiscordEvents(bot);
	});
}

const port = EnvManager.PORT;

server.listen(port, () => {
	Logger.log(`Server listening on port ${port}`, { logToConsole: true });
});

process.on("uncaughtException", async error => {
	await Logger.error(`Oh my god, something terrible happened: ${error}`, {
		notifyDiscordAdmin: true,
		logToConsole: true,
	});

	process.exit(1); // exit application
});
