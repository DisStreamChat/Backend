import { log } from "../utils/functions/logging";
import { getUserClient } from "./userClients";

import { discordClient, twitchClient } from "../utils/initClients";
import admin from "firebase-admin";
import { Server, Socket } from "socket.io";
import { DefaultEventsMap } from "socket.io/dist/typed-events";
import { AddEventModel } from "../models/sockets.model";
import { leaveAllRooms } from "./utils";
import { transformTwitchUsername } from "../utils/functions/stringManipulation";

export interface CustomSocket extends Socket<DefaultEventsMap, DefaultEventsMap> {
	data: {
		twitchName: string;
		guildId: string;
		liveChatId: string[];
	};
}

export const sockets = (io: Server<DefaultEventsMap, DefaultEventsMap>) => {
	io.on("connection", (socket: CustomSocket) => {
		log(`${socket.id} connected`, { writeToConsole: true });

		socket.on("add", async (message: AddEventModel) => {
			log(`adding: ${JSON.stringify(message, null, 4)} to: ${socket.id}`, { writeToConsole: true });

			let { twitchName, guildId, liveChatId } = message;

			if (typeof twitchName === "string") {
				twitchName = transformTwitchUsername(twitchName.toLowerCase());
			}

			if (message.leaveAll) {
				leaveAllRooms(socket);
			}

			try {
				const channels = twitchClient.channels;
				if (!channels.includes(twitchName)) {
					twitchClient.join(twitchName);
					log(`joined channel: ${twitchName}`, { writeToConsole: true });
				}

				if (twitchName) await socket.join(`twitch-${twitchName}`);
				if (guildId) await socket.join(`guild-${guildId}`);
				if (liveChatId) {
					if (liveChatId instanceof Array) {
						for (const id of liveChatId) {
							await socket.join(`channel-${id}`);
						}
					} else {
						await socket.join(`channel-${liveChatId}`);
					}
				}
				socket.data = { twitchName, guildId, liveChatId };
			} catch (err) {
				log(err, { writeToConsole: true, error: true });
			}
		});

		socket.on("deletemsg - discord", async data => {
			const { id, mod_id: modId, refresh_token: refreshToken } = data;
			const { guildId, liveChatId } = socket.data;

			const modRef = admin.firestore().collection("Streamers").doc(modId).collection("discord").doc("data");
			const modData: any = await modRef.get();
			const modRefreshToken = modData.refreshToken;

			if (modRefreshToken !== refreshToken) throw new Error("Bad Auth");

			const connectGuild = discordClient.guilds.resolve(guildId);
			const guildChannels = connectGuild.channels;

			for (const channelId of liveChatId) {
				try {
					const liveChatChannel: any = guildChannels.resolve(channelId);
					const messageManager = liveChatChannel.messages;

					const messageToDelete = await messageManager.fetch(id);

					messageToDelete.delete();
				} catch (err) {
					log(err.message, { error: true });
				}
			}
		});

		socket.on("banuser - discord", async data => {
			let { user } = data;
			const { guildId } = socket.data;
			const connectGuild = discordClient.guilds.resolve(guildId);

			const modId = data.mod_id;
			const refreshToken = data.refresh_token;

			const modRef = admin.firestore().collection("Streamers").doc(modId).collection("discord").doc("data");
			const modData: any = await modRef.get();
			const modRefreshToken = modData.refreshToken;

			if (modRefreshToken !== refreshToken) {
				log("Bad mod auth", { error: true, writeToConsole: true });
				throw new Error("Bad Auth");
			}

			try {
				connectGuild.members.ban(user, { days: 1 });
			} catch (err) {
				log(err.message, { error: true });
			}
		});

		socket.on("deletemsg - twitch", async data => {
			const { twitchName } = socket.data;

			async function botDelete(id: string) {
				await twitchClient.deleteMessage(twitchName, id);
			}

			let id = data.id;

			if (!id) {
				botDelete(data);
			} else {
				const modName = data.modName;
				const refreshToken = data.refresh_token;
				if (!refreshToken) {
					await botDelete(id);
				} else {
					try {
						let UserClient = await getUserClient(refreshToken, modName, twitchName);
						await UserClient.deletemessage(twitchName, id);
						UserClient = null;
					} catch (err) {
						log(err.message, { error: true });
						await botDelete(id);
					}
				}
			}
		});

		socket.on("timeoutuser - twitch", async data => {
			const { twitchName } = socket.data;

			let { user } = data;
			async function botTimeout(user: string) {
				await twitchClient.timeout(twitchName, user, data.time);
			}
			if (!user) {
				await botTimeout(data);
			} else {
				const modName = data.modName;
				const refreshToken = data.refresh_token;

				if (!refreshToken) {
					await botTimeout(user);
				} else {
					try {
						let UserClient = await getUserClient(refreshToken, modName, twitchName);
						await UserClient.timeout(twitchName, user, data.time ?? 300);
						UserClient = null;
					} catch (err) {
						log(err.message, { error: true });
						await botTimeout(user);
					}
				}
			}
		});

		socket.on("banuser - twitch", async data => {
			const { twitchName } = socket.data;

			let user = data.user;
			async function botBan(user: string) {
				await twitchClient.ban(twitchName, user);
			}

			const modName = data.modName;
			const refreshToken = data.refresh_token;

			if (!refreshToken) {
				botBan(user);
			} else {
				try {
					let UserClient = await getUserClient(refreshToken, modName, twitchName);
					await UserClient.ban(twitchName, user);
					UserClient = null;
				} catch (err) {
					log(err.message, { error: true });
					botBan(user);
				}
			}
		});

		socket.on("sendchat", async data => {
			log(`send chat: ${JSON.stringify(data, null, 4)}`);
			const { sender, refreshToken, message } = data;
			const { twitchName } = socket.data;

			if (!refreshToken) {
				log("no authed message", { writeToConsole: true });
				throw new Error("no auth");
			}
			if (sender && message) {
				try {
					let UserClient = await getUserClient(refreshToken, sender, twitchName);
					try {
						await UserClient.join(twitchName);
						await UserClient.say(twitchName, message);
					} catch (err) {
						await UserClient.say(twitchName, message);
					}
					UserClient = null;
				} catch (err) {
					log(err.message, { error: true });
				}
			}
		});

		socket.on("disconnect", () => {
			log(`${socket.id} disconnected`, { writeToConsole: true });
		});
	});
};
