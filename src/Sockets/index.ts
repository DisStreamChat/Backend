import { log } from "../utils/functions/logging";
import { getUserClient } from "./userClients";

import { discordClient, twitchClient, TwitchApiClient } from "../utils/initClients";
import admin from "firebase-admin";
import { Server, Socket } from "socket.io";
import { DefaultEventsMap } from "socket.io/dist/typed-events";
import { AddEventModel } from "../models/sockets.model";
import { leaveAllRooms } from "./utils";
import { transformTwitchUsername } from "../utils/functions/stringManipulation";
import cookie from "cookie";
export interface CustomSocket extends Socket<DefaultEventsMap, DefaultEventsMap> {
	data: {
		twitchName: string;
		guildId: string;
		liveChatId: string[];
		twitchData: {
			refreshToken: string;
			userId: string;
			name: string;
		};
	};
}

export const sockets = (io: Server<DefaultEventsMap, DefaultEventsMap>) => {
	io.on("connection", async (socket: CustomSocket) => {
		log(`${socket.id} connected`, { writeToConsole: true });

		try {
			const token = cookie.parse(socket.handshake.headers.cookie)["auth-token"];

			const verifiedToken = await admin.auth().verifyIdToken(token);

			const userRef = admin.firestore().collection("Streamers").doc(verifiedToken.uid);
			const twitchRef = userRef.collection("twitch").doc("data");
			const twitchData = (await twitchRef.get()).data();
			const twitchUserData = await TwitchApiClient.getUserInfo(twitchData.user_id);
			socket.data.twitchData = {
				refreshToken: twitchData.refresh_token,
				userId: twitchData.user_id,
				name: twitchUserData.login,
			};
		} catch (err) {
			socket.disconnect();
		}

		socket.on("add", async (message: AddEventModel) => {
			log(`adding: ${JSON.stringify(message, null, 4)} to: ${socket.id}`, { writeToConsole: true });

			let { twitchName, guildId, liveChatId } = message;

			if (typeof twitchName === "string") {
				twitchName = transformTwitchUsername(twitchName.toLowerCase());
			}

			if (message.leaveAll) {
				io.to(socket.id).emit("left-all");
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
				if (twitchName === "dscnotifications") return;
				socket.data = { ...socket.data, twitchName, guildId, liveChatId };
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
			const {
				twitchName,
				twitchData: { refreshToken, name },
			} = socket.data;

			async function botDelete(id: string) {
				await twitchClient.deleteMessage(twitchName, id);
			}

			let { id } = data;

			try {
				let userClient = await getUserClient(refreshToken, name, twitchName);
				await userClient.deletemessage(twitchName, id);
				userClient = null;
			} catch (err) {
				log(err.message, { error: true });
				await botDelete(id);
			}
		});

		socket.on("timeoutuser - twitch", async data => {
			const {
				twitchName,
				twitchData: { refreshToken, name },
			} = socket.data;

			let { user } = data;
			async function botTimeout(user: string) {
				await twitchClient.timeout(twitchName, user, data.time);
			}

			try {
				let userClient = await getUserClient(refreshToken, name, twitchName);
				await userClient.timeout(twitchName, user, data.time ?? 300);
				userClient = null;
			} catch (err) {
				log(err, { error: true });
				await botTimeout(user);
			}
		});

		socket.on("banuser - twitch", async data => {
			const {
				twitchName,
				twitchData: { refreshToken, name },
			} = socket.data;

			let user = data.user;
			async function botBan(u: string) {
				await twitchClient.ban(twitchName, u);
			}

			try {
				let userClient = await getUserClient(refreshToken, name, twitchName);
				await userClient.ban(twitchName, user);
				userClient = null;
			} catch (err) {
				log(err, { error: true });
				botBan(user);
			}
		});

		socket.on("sendchat", async data => {
			log(`send chat: ${JSON.stringify(data, null, 4)}`, { writeToConsole: true });
			const { message } = data;
			const {
				twitchName,
				twitchData: { refreshToken, name },
			} = socket.data;

			if (message && message.length) {
				try {
					let userClient = await getUserClient(refreshToken, name, twitchName);
					try {
						await userClient.join(twitchName);
						await userClient.say(twitchName, message);
					} catch (err) {
						await userClient.say(twitchName, message);
					}
					userClient = null;
				} catch (err) {
					log(err, { error: true });
				}
			}
		});

		socket.on("disconnect", () => {
			log(`${socket.id} disconnected`, { writeToConsole: true });
		});
	});
};
