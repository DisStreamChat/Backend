import  dotenv from "dotenv"
dotenv.config()
import TwitchEvents from "./Twitch/TwitchEvents";
import DiscordEvents from "./Discord/DiscordEvents";
import { log } from "./utils/functions/logging";
import {sockets} from "./Sockets"
// get the initialized clients from another file
import { DiscordClient, TwitchClient, customBots } from "./utils/initClients";
import {initializeApp, credential} from "firebase-admin";
import {io, server, app} from "./app"

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
TwitchEvents(TwitchClient, io, app);

////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// DISCORD
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

// see ./DiscordEvents.js
DiscordEvents(DiscordClient, io, app);
if (process.env.BOT_DEV != "true") {
	customBots.then(bots => {
		for (const bot of bots.values()) {
			DiscordEvents(bot, io, app);
		}
	});
}

////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// SOCKET CONNECTION HANDLING
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
log(`Bot Dev: ${process.env.BOT_DEV}`, {writeToConsole: true})
sockets(io)

app.use((req, res) => {
	res.status(404).json({
		status: 404,
		message: "Page Not Found",
	});
});

const port = process.env.PORT || 3200;

server.listen(port, () => {
	console.log(`listening on port ${port}`);
});