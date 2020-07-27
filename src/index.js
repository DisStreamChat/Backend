require("dotenv").config();
const express = require("express");
const app = express();
const server = require("http").Server(app);
const io = require("socket.io")(server);
const cors = require("cors");
const bodyParser = require("body-parser");
const helemt = require("helmet");
const TwitchEvents = require("./Twitch/TwitchEvents.js");
const crypto = require("crypto");
const ranks = require("./ranks.json");
const fetch = require("node-fetch");
const tmi = require("tmi.js");
const { getAllEvents, listenMessages } = require("./routes/youtubeMessages");

////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// SETUP
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

// add the basic middleware to the express app
app.use(helemt());
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

// get the initialized clients from another file
const { DiscordClient, TwitchClient } = require("./utils/initClients");
const DiscordEvents = require("./Discord/DiscordEvents.js");
const admin = require("firebase-admin");
const { ArrayAny } = require("./utils/functions.js");

// initialize the object that will store all sockets currently connected
const sockets = {};

io.origins((origin, callback) => {
	console.log(origin);
	callback(null, true);
});

////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// TWITCH
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

// see ./TwitchEvents.js
TwitchEvents(TwitchClient, sockets, app);

////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// DISCORD
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

// see ./DiscordEvents.js
DiscordEvents(DiscordClient, sockets, app);

////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// Youtube Events
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

app.get("/youtube/events", async (req, res, next) => {
	try {
		const events = await getAllEvents(req.query.id);
		return res.json(events);
	} catch (error) {
		return next(error);
	}
});

let listening = false;
async function listenChat(channelId) {
	if (!channelId) {
		return {
			listening: false,
		};
	}
	if (listening) {
		return {
			listening: true,
		};
	}
	const liveEvent = (await getAllEvents(channelId)).find(event => event.liveStreamingDetails.concurrentViewers);
	if (liveEvent) {
		listening = true;
		const {
			snippet: { liveChatId },
		} = liveEvent;
		const listener = listenMessages(liveChatId);
		listener.on("messages", async newMessages => {
			if (!sockets.hasOwnProperty(channelId)) return;
			newMessages = newMessages.sort((a, b) => a.publishedAt - b.publishedAt);
			newMessages.forEach(message => {
				const _ = [...sockets[channelId]].forEach(async s => await s.emit("chatmessage", message));
			});
		});
		listener.on("event-end", data => {
			listening = false;
			if (!sockets.hasOwnProperty(channelId)) return;
			const _ = [...sockets[channelId]].forEach(async s => await s.emit("event-end", data));
		});
		return {
			listening: true,
		};
	}
	return {
		listening: false,
	};
}

app.get("/youtube/listen", async (req, res) => {
	const result = await listenChat(req.query.id);
	return res.json(result);
});

////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// SOCKET CONNECTION HANDLING
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

// add a socket to a set at an id (key)
const addSocket = (socket, id) => {
	if (id != undefined) {
		id = id.toLowerCase();
		if (sockets[id]) {
			sockets[id].add(socket);
		} else {
			sockets[id] = new Set([socket]);
		}
	}
};

io.on("connection", socket => {
	console.log("a user connected");
	socket.emit("imConnected");
	// the addme event is sent from the frontend on load with the data from the database
	socket.on("addme", message => {
		const { TwitchName, guildId } = message;
		const youtubeChannelId = message.youtubeChannelId;
		socket.userInfo = message;

		if (youtubeChannelId) {
			addSocket(socket, youtubeChannelId);
		}
		addSocket(socket, guildId);
		addSocket(socket, TwitchName);
		TwitchClient.join(TwitchName);
		// TODO use client.join(channel)
	});

	// deprecated
	socket.on("updatedata", data => {
		socket.userInfo = data;
	});

	socket.on("deletemsg - discord", async data => {
		let id = data.id || data;
		const { guildId, liveChatId } = socket.userInfo;

		const connectGuild = DiscordClient.guilds.resolve(guildId);
		const guildChannels = connectGuild.channels;

		for (const channelId of liveChatId) {
			try {
				const liveChatChannel = guildChannels.resolve(channelId);
				const messageManager = liveChatChannel.messages;

				const messageToDelete = await messageManager.fetch(id);

				messageToDelete.delete();
			} catch (err) {
				console.log(err.message);
			}
		}
	});

	socket.on("timeoutuser - discord", async user => {
		const { guildId } = socket.userInfo;
		const connectGuild = DiscordClient.guilds.resolve(guildId);
		let muteRole = connectGuild.roles.cache.find(role => role.name === "Muted");
		if (!muteRole) {
			connectGuild.roles.create({ data: { name: "Muted", color: "#000001", permissions: [] } });
			muteRole = connectGuild.roles.cache.find(role => role.name === "Muted");
		}
		try {
			console.log(`Timeout ${user} - Discord`);
			const member = connectGuild.members.resolve(user);
			member.roles.add(muteRole);
			const _ = [...sockets[guildId]].forEach(async s => await s.emit("purgeuser", member.nickname));
			await new Promise(resolve => setTimeout(resolve, 300000));
			member.roles.remove(muteRole);
		} catch (err) {
			console.log(err.message);
		}
	});

	socket.on("banuser - discord", async user => {
		const { guildId } = socket.userInfo;
		const connectGuild = DiscordClient.guilds.resolve(guildId);
		try {
			console.log(`Banning ${user} - Discord`);
			connectGuild.members.ban(user, { days: 1 });
		} catch (err) {
			console.log(err.message);
		}
	});

	socket.on("deletemsg - twitch", async data => {
		const { TwitchName } = socket.userInfo;
		function botDelete(id) {
			try {
				TwitchClient.deletemessage(TwitchName, id);
			} catch (err) {
				console.log(err.message);
			}
		}
		let id = data.id;

		if (!id) {
			botDelete(data);
		} else {
			const modName = data.modName;
			const modRef = (await admin.firestore().collection("Streamers").where("TwitchName", "==", modName).get()).docs[0];
			const modData = modRef.data();
			if (!modData) {
				botDelete(id);
			} else {
				try {
					const modPrivateDataRef = await admin.firestore().collection("Streamers").doc(modData.uid).collection("twitch").doc("data").get();
					const modPrivateData = modPrivateDataRef.data();
					if (!modPrivateData) {
						throw new Error("no twitch auth");
					}
					const refreshToken = modPrivateData.refresh_token;
					const response = await fetch(`https://api.disstreamchat.com/twitch/token/refresh?token=${refreshToken}`);
					const data = await response.json();
					if (!data) {
						throw new Error("bad refresh token");
					}
					const scopes = data.scope;
					if (!ArrayAny(scopes, ["chat:edit", "chat:read", "channel:moderate"])) {
						throw new Error("bad scopes");
					}
					const UserClient = new tmi.Client({
						options: { debug: false },
						connection: {
							secure: true,
							reconnect: true,
						},
						identity: {
							username: modName,
							password: data.access_token,
						},
						channels: [TwitchName],
					});
					await UserClient.connect();
					await UserClient.deletemessage(TwitchName, id);
					await UserClient.disconnect();
				} catch (err) {
					console.log(err.message);
					botDelete(id);
				}
			}
		}
	});

	socket.on("timeoutuser - twitch", async user => {
		const { TwitchName } = socket.userInfo;
		try {
			console.log(`Timeout ${user} - Twitch`);
			//Possible to do: let default timeouts be assigned in dashboard
			await TwitchClient.timeout(TwitchName, user, 300);
		} catch (err) {
			console.log(err.message);
		}
	});

	socket.on("banuser - twitch", async user => {
		const { TwitchName } = socket.userInfo;
		try {
			console.log(`Banning ${user} - Twitch`);
			await TwitchClient.ban(TwitchName, user);
		} catch (err) {
			console.log(err.message);
		}
	});

	socket.on("heartbeart", () => {
		socket.emit("pong");
	});

	socket.on("disconnect", () => {
		console.log("a user disconnected");

		// it is possible that the socket doesn't have userinfo if it connected to an invalid user
		if (socket.userInfo == undefined) return;

		// remove the socket from the object
		const { TwitchName, guildId } = socket.userInfo;

		guildSockets = sockets[guildId];
		channelSockets = sockets[TwitchName];

		if (guildSockets instanceof Set) guildSockets.delete(socket);
		if (channelSockets instanceof Set) channelSockets.delete(socket);
	});
});

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
