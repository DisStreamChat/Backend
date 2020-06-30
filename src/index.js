require("dotenv").config();
const express = require("express");
const app = express();
const server = require("http").Server(app);
const io = require("socket.io")(server);
const cors = require("cors");
const bodyParser = require("body-parser");
const helemt = require("helmet");
const TwitchEvents = require("./TwitchEvents.js");
const crypto = require("crypto");
const { formatMessage } = require("./utils/messageManipulation");
const ranks = require('./ranks.json');

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

// get the initialized clients from another file
const { DiscordClient, TwitchClient } = require("./utils/initClients");

// initialize the object that will store all sockets currently connected
const sockets = {};

////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// TWITCH
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

// see ./TwitchEvents.js
TwitchEvents(TwitchClient, sockets, app);

////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// DISCORD MESSAGE HANDLING
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

// TODO: move discord events to separate file
DiscordClient.on("message", async message => {
	if (message.guild == null) return;
	// if the message was sent by a bot it should be ignored
	if (message.author.bot) return;
	if (!sockets.hasOwnProperty(message.guild.id)) return;

	const { liveChatId } = [...sockets[message.guild.id]][0].userInfo;

	// don't waste time with the rest of the stuff if there isn't a connection to this guild
	if (message.channel.id != liveChatId && !liveChatId.includes(message.channel.id)) return;

	const senderName = message.member.displayName;

	const badges = {};

	if (message.guild.ownerID == message.author.id) {
		badges["owner"] = {
			image: "https://static-cdn.jtvnw.net/badges/v1/5527c58c-fb7d-422d-b71b-f309dcb85cc1/3",
			title: "Server Owner",
		};
	} else {
		if (message.member.hasPermission(['MANAGE_MESSAGES'])) {
			badges["moderator"] = {
				image: "https://static-cdn.jtvnw.net/badges/v1/3267646d-33f0-4b17-b3df-f923a41db1d0/3",
				title: "Moderator",
			}
		}
	}

	if (ranks.discord.developers.includes(message.author.id)) {
		badges["developer"] = {
			image: "https://cdn.discordapp.com/attachments/699812263670055052/722630142987468900/icon_18x18.png",
			title: "DisStreamchat Staff",
		};
	}

	try {
		const CleanMessage = message.cleanContent;
		// const plainMessage = formatMessage(CleanMessage, "discord", {});
		const HTMLCleanMessage = await formatMessage(CleanMessage, "discord", {}, { HTMLClean: true });
		// const censoredMessage = formatMessage(CleanMessage, "discord", {}, { censor: true });
		// const HTMLCensoredMessage = formatMessage(CleanMessage, "discord", {}, { HTMLClean: true, censor: true });

        // TODO: make customizable
		if (HTMLCleanMessage.startsWith("!") || HTMLCleanMessage.startsWith("?")) return;

		const messageObject = {
			displayName: senderName,
			avatar: message.author.displayAvatarURL(),
			body: HTMLCleanMessage,
			// HTMLCleanMessage,
			// censoredMessage,
			// HTMLCensoredMessage,
			platform: "discord",
			messageId: "",
			uuid: message.id,
			id: message.id,
			badges,
            sentAt: message.createdAt.getTime(),
            // TODO: improve with roles
			userColor: message.member.displayHexColor === "#000000" ? "#FFFFFF" : message.member.displayHexColor,
		};

		if (messageObject.body.length <= 0) return;

		const _ = [...sockets[message.guild.id]].forEach(async s => await s.emit("chatmessage", messageObject));
	} catch (err) {
		console.log(err.message);
	}
});

DiscordClient.on("messageDelete", message => {
	try {
		if (sockets.hasOwnProperty(message.guild.id)) [...sockets[message.guild.id]].forEach(async s => await s.emit("deletemessage", message.id));
	} catch (err) {
		console.log(err.message);
	}
});

////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// SOCKET CONNECTION HANDLING
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

// add a socket to a set at set id (key)
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
    socket.emit("imConnected")
	// the addme event is sent from the frontend on load with the data from the database
	socket.on("addme", message => {
		const { TwitchName, guildId } = message;
		socket.userInfo = message;

		addSocket(socket, guildId);
		addSocket(socket, TwitchName);
		TwitchClient.join(TwitchName);
		// TODO use client.join(channel)
	});

    // deprecated
	socket.on("updatedata", data => {
		socket.userInfo = data;
	});

	socket.on("deletemsg - discord", async id => {
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

	socket.on("deletemsg - twitch", async id => {
		const { TwitchName } = socket.userInfo;
		try {
			TwitchClient.deletemessage(TwitchName, id);
		} catch (err) {
			console.log(err.message);
		}
    });
    
    socket.on("heartbeart", () => {
        socket.emit("pong")
    })

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
