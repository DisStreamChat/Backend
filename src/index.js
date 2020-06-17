const express = require("express");
const app = express();
const server = require("http").Server(app);
const io = require("socket.io")(server);
require("dotenv").config();
const cors = require("cors");
const bodyParser = require("body-parser");
const TwitchApi = require("twitch-lib");
const helemt = require("helmet");
const morgan = require("morgan");
const TwitchEvents = require("./TwitchEvents.js")

////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// SETUP
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

// add the basic middleware to the express app
app.use(helemt());
// app.use(morgan("dev"))
app.use(cors());
app.use(bodyParser.json());

// add the routes stored in the 'routes' folder to the app
app.use("/", require("./routes/index"));

// get the initialized clients from another file
const { DiscordClient, TwitchClient } = require("./utils/initClients");

// initialize the object that will store all sockets currently connected
const sockets = {};

////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// TWITCH
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

TwitchEvents(TwitchClient, sockets)

////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// DISCORD MESSAGE HANDLING
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

DiscordClient.on("message", async message => {
	// if the message was sent by a bot it should be ignored
	if (message.author.bot) return;
	if (!sockets.hasOwnProperty(message.guild.id)) return;

	const { liveChatId } = [...sockets[message.guild.id]][0].userInfo;

	// don't waste time with the rest of the stuff if there isn't a connection to this guild
	if (message.channel.id != liveChatId && !liveChatId.includes(message.channel.id)) return;

	const senderName = message.member.displayName;
	try {
		const CleanMessage = message.cleanContent;
		const plainMessage = formatMessage(CleanMessage, "discord", {});
		const HTMLCleanMessage = formatMessage(CleanMessage, "discord", {}, { HTMLClean: true });
		const censoredMessage = formatMessage(CleanMessage, "discord", {}, { censor: true });
		const HTMLCensoredMessage = formatMessage(CleanMessage, "discord", {}, { HTMLClean: true, censor: true });

		if (plainMessage.startsWith("!") || plainMessage.startsWith("?")) return;

		const messageObject = {
			displayName: senderName,
			avatar: message.author.displayAvatarURL(),
			body: HTMLCleanMessage,
			HTMLCleanMessage,
			censoredMessage,
			HTMLCensoredMessage,
			platform: "discord",
			messageId: "",
			uuid: message.id,
			id: message.id,
			badges: {},
			sentAt: message.createdAt.getTime(),
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
	// the addme event is sent from the frontend on load with the data from the database
	socket.on("addme", message => {
		const { TwitchName, guildId } = message;
		socket.userInfo = message;

		addSocket(socket, guildId);
		addSocket(socket, TwitchName);
		TwitchClient.join(TwitchName);
		// TODO use client.join(channel)
	});

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
		if (channelSockets instanceof Set && channelSockets.size <= 0) {
			// TwitchClient.part(TwitchName)
		}
	});
});

const port = process.env.PORT || 3200;

server.listen(port, () => {
	console.log(`listening on port ${port}`);
});
