import admin from "firebase-admin";
import fs from "fs";
import path from "path";

import { DiscordMessageModel } from "../models/message.model";
// TODO: move to firebase db
import ranks from "../ranks.json";
import { log } from "../utils/functions/logging";
// get functions used to do things like strip html and replace custom discord emojis with the url to the image
import { formatMessage } from "../utils/messageManipulation";
import { sendMessage } from "../utils/sendMessage";
import CommandHandler from "./CommandHandler";
import { handleLeveling } from "./Leveling";
import ReactionRoles from "./Reaction Manager";

const eventPath = path.join(__dirname, "./Events");
const eventFiles = fs.readdirSync(eventPath);

export default async (client, io) => {
	ReactionRoles(client);
	// TODO: move discord events to separate file
	eventFiles.forEach(event => {
		if (event.endsWith(".js")) {
			const { default: eventHandler } = require(path.join(eventPath, event));
			client.on(event.slice(0, -3), async (...params) => {
				try {
					await eventHandler(...params, client);
				} catch (err) {
					log(`Event Error: ${err.message}`);
				}
			});
		}
	});

	client.settings = {};
	client.logging = {};
	client.leveling = {};
	client.listeners = {};

	admin
		.firestore()
		.collection("logging")
		.onSnapshot(snapshot => {
			const changes = snapshot.docChanges();
			changes.map(change => {
				client.logging[change.doc.id] = change.doc.data();
			});
		});

	admin
		.firestore()
		.collection("DiscordSettings")
		.onSnapshot(snapshot => {
			const changes = snapshot.docChanges();
			changes.map(change => {
				client.settings[change.doc.id] = change.doc.data();
			});
		});

	client.on("message", async message => {
		try {
			if (!message.guild || !message.member) return;
			// handle commands and leveling, if they are enabled for the server
			if (!message.author.bot) {
				await handleLeveling(message, client);

				await CommandHandler(message, client);
			}

			const senderName = message.member.displayName;

			const badges = {};

			// custom badges based on permissions or if the user is an admin
			if (message.member) {
				if (message.guild.ownerID == message.author.id) {
					badges["broadcaster"] = {
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
			}

			if (message.author.bot) {
				badges["bot"] = {
					image: "https://cdn.betterttv.net/tags/bot.png",
					title: "Discord Bot",
				};
			}

			//Setting Override/Default Color (Webhooks aren't members, so we default to this)
			let userHexColor = "#FFFFFF";

			if (message.member) {
				userHexColor = message.member.displayHexColor === "#000000" ? userHexColor : message.member.displayHexColor;
			}

			try {
				const CleanMessage = message.cleanContent;
				const HTMLCleanMessage = await formatMessage(CleanMessage, "discord", {}, { HTMLClean: true });

				const messageObject: DiscordMessageModel = {
					displayName: senderName,
					username: message.author.username,
					userId: message.author.id,
					avatar: message.author.displayAvatarURL(),
					body: HTMLCleanMessage,
					platform: "discord",
					messageId: "",
					messageType: "chat",
					id: message.id,
					badges,
					sentAt: message.createdAt.getTime(),
					userColor: userHexColor,
				};

				if (messageObject.body.length <= 0) return;

				io.in(`channel-${message.channel.id}`).emit("chatmessage", messageObject);
				sendMessage(messageObject, { channel: message.channel.id, platform: "channel" });
			} catch (err) {
				log(err.message, { error: true });
			}
		} catch (err) {
			log(`Error in discord message: ${err.message}`);
		}
	});

	client.on("messageDelete", message => {
		try {
			io.in(`channel-${message.channel.id}`).emit("deletemessage", message.id);
		} catch (err) {
			log(`Error deleting discord message: ${err.message}`);
		}
	});

	client.on("messageDeleteBulk", message => {
		message.forEach(msg => {
			try {
				io.in(`guild-${msg.guild.id}`).emit("deletemessage", msg.id);
			} catch (err) {
				log(`Error deleting discord message: ${err.message}`);
			}
		});
	});

	client.on("messageUpdate", async (oldMsg, newMsg) => {
		try {
			const HTMLCleanMessage = await formatMessage(newMsg.cleanContent, "discord", {}, { HTMLClean: true });
			const updateMessage = {
				body: HTMLCleanMessage,
				id: newMsg.id,
			};
			io.in(`channel-${newMsg.channel.id}`).emit("updateMessage", updateMessage);
		} catch (err) {
			log(`Error updating discord message: ${err.message}`);
		}
	});
};
