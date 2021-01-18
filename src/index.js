require("dotenv").config();
import express from "express";
const app = express();
import http from "http";
const server = http.Server(app);
import socketio from "socket.io";
const io = socketio(server);
import cors from "cors";
import bodyParser from "body-parser";
import helmet from "helmet";
import TwitchEvents from "./Twitch/TwitchEvents";
import DiscordEvents from "./Discord/DiscordEvents";
import crypto from "crypto";
import { log } from "./utils/functions/logging";
import {sockets} from "./Sockets"
// get the initialized clients from another file
const { DiscordClient, TwitchClient, customBots } = require("./utils/initClients");
const { ArrayAny } = require("./utils/functions");
const admin = require("firebase-admin");

try {
	// get the serviceAccount details from the base64 string stored in environment variables
	const serviceAccount = JSON.parse(Buffer.from(process.env.GOOGLE_CONFIG_BASE64, "base64").toString("ascii"));

	// initialze the firebase admin api, this is used for generating a custom token for twitch auth with firebase
	admin.initializeApp({
		credential: admin.credential.cert(serviceAccount),
	});
} catch (err) {}

////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// SETUP
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

// add the basic middleware to the express app
app.use(helmet());
app.use(cors());

// this function is used to verify twitch webhook requests
app.use(
	bodyParser.json({
		verify: function (req, res, buf, encoding) {
			// is there a hub to verify against
			req.twitch_hub = false;
			if (req.headers && req.headers["x-hub-signature"]) {
				req.twitch_hub = true;

				var xHub = req.headers["x-hub-signature"].split("=");

				req.twitch_hex = crypto.createHmac(xHub[0], process.env.WEBHOOK_SECRET).update(buf).digest("hex");
				req.twitch_signature = xHub[1];
			}
		},
	})
);

// add the routes stored in the 'routes' folder to the app
app.use("/", require("./routes/index"));
app.use("/public", express.static("public"));
app.use("/images", express.static("images"));

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
