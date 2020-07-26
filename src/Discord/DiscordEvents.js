// get functions used to do things like strip html and replace custom discord emojis with the url to the image
const { formatMessage } = require("../utils/messageManipulation");
const CommandHandler = require("./CommandHandler");

// TODO: move to firebase db
const ranks = require("../ranks.json");

// the admin app has already been initialized in routes/index.js
const admin = require("firebase-admin");
const { Random } = require("../utils/functions");

const getLevel = xp => Math.max(0, Math.floor(Math.log(xp-100)));

module.exports = (DiscordClient, sockets, app) => {
	const handleLeveling = async message => {
		const levelingDataRef = await admin.firestore().collection("Leveling").doc(message.guild.id).get();
		const levelingData = levelingDataRef.data();
		if (levelingData) {
			let userLevelingData = levelingData[message.author.id];
			if (!userLevelingData) {
				userLevelingData = { xp: 0, level: 0, cooldown: 0 };
			}
			const now = new Date().getTime();
			const cooldownTime = 60000;
			const expireTime = userLevelingData.cooldown + cooldownTime;
			if (now > expireTime) {
				userLevelingData.cooldown = now;
				userLevelingData.xp += Random(10, 20);
				userLevelingData.xp = Math.floor(userLevelingData.xp);
				let currentLevel = userLevelingData.level;
				let newLevel = getLevel(userLevelingData.xp);
				if(newLevel > currentLevel){
                    message.channel.send(`Congrats ${message.author}, you leveled up to level ${newLevel}`)
                    userLevelingData.level = newLevel
                }
				levelingData[message.author.id] = userLevelingData;
				await admin.firestore().collection("Leveling").doc(message.guild.id).update(levelingData);
			}
		} else {
			await admin.firestore().collection("Leveling").doc(message.guild.id).set({});
		}
	};

	// TODO: move discord events to separate file
	DiscordClient.on("message", async message => {
		if (message.guild == null) return;
		// if the message was sent by a bot it should be ignored
		if (message.author.bot) return;

		if (message.guild.id === "711238743213998091") {
			// remove in the future to make it work on all guilds
			await handleLeveling(message);
			await CommandHandler(message, DiscordClient);
		}

		if (!sockets.hasOwnProperty(message.guild.id)) return;

		const { liveChatId } = [...sockets[message.guild.id]][0].userInfo;

		// don't waste time with the rest of the stuff if there isn't a connection to this guild
		if (message.channel.id != liveChatId && !liveChatId.includes(message.channel.id)) return;

		const senderName = message.member.displayName;

		const badges = {};

		if (message.guild.ownerID == message.author.id) {
			badges["owner"] = {
				image: "https://static-cdn.jtvnw.net/badges/v1/5527c58c-fb7d-422d-b71b-f309dcb85cc1/1",
				title: "Server Owner",
			};
		} else {
			if (message.member.hasPermission(["MANAGE_MESSAGES"])) {
				badges["moderator"] = {
					image: "https://static-cdn.jtvnw.net/badges/v1/3267646d-33f0-4b17-b3df-f923a41db1d0/1",
					title: "Moderator",
				};
			}
		}

		if (message.member.premiumSinceTimestamp) {
			badges["booster"] = {
				image: "https://cdn.discordapp.com/attachments/711241287134609480/727707559045365771/serverbooster.png",
				title: "Server Booster",
			};
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

			const messageObject = {
				displayName: senderName,
				username: message.author.username,
				userId: message.author.id,
				avatar: message.author.displayAvatarURL(),
				body: HTMLCleanMessage,
				// HTMLCleanMessage,
				// censoredMessage,
				// HTMLCensoredMessage,
				platform: "discord",
				messageId: "",
				messageType: "chat",
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
			if (sockets.hasOwnProperty(message.guild.id))
				[...sockets[message.guild.id]].forEach(async s => await s.emit("deletemessage", message.id));
		} catch (err) {
			console.log(err.message);
		}
	});

	DiscordClient.on("messageDeleteBulk", message => {
		message.forEach(msg => {
			try {
				if (sockets.hasOwnProperty(msg.guild.id)) [...sockets[msg.guild.id]].forEach(async s => await s.emit("deletemessage", msg.id));
			} catch (err) {
				console.log(err.message);
			}
		});
	});

	DiscordClient.on("messageUpdate", async (oldMsg, newMsg) => {
		if (!sockets.hasOwnProperty(newMsg.channel.guild.id)) return;
		const { liveChatId } = [...sockets[newMsg.channel.guild.id]][0].userInfo;
		if (newMsg.channel.id != liveChatId && !liveChatId.includes(newMsg.channel.id)) return;
		try {
			const HTMLCleanMessage = await formatMessage(newMsg.cleanContent, "discord", {}, { HTMLClean: true });
			const updateMessage = {
				body: HTMLCleanMessage,
				id: newMsg.id,
			};
			const _ = [...sockets[newMsg.channel.guild.id]].forEach(async s => await s.emit("updateMessage", updateMessage));
		} catch (err) {
			console.log(err.message);
		}
	});

	DiscordClient.on("guildMemberAdd", async member => {
		if (member.guild.id === "711238743213998091") {
			await member.send(
				`Welcome to the DisStreamChat community. If you need help setting up DisStreamChat feel free to ask in any of the help channels. But try to find a help channel related to you problem. If you can't talk in any of the chats just DM a moderator and they will sort out the issue. Any suggestions or bug reports you have should go in the respective channels. 😀`
			);
		}
	});
};
