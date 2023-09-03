import admin from "firebase-admin";
import Server from "socket.io";

import { log } from "../utils/functions/logging";
import { clientManager } from "../utils/initClients";
import { addMe } from "./addme";
import { sendChat } from "./send-chat";
import { userClientManager } from "./userClientManager";

export const sockets = (io: Server.Server) => {
	log("setting up sockets", { writeToConsole: true });

	io.origins((_, callback) => {
		callback(null, true);
	});
	io.on("connection", socket => {
		log("a user connected", { writeToConsole: true });
		socket.emit("imConnected");

		// the addme event is sent from the frontend on load with the data from the database
		socket.on("addme", async message => addMe(message, socket));

		socket.on("deletemsg - discord", async data => {
			let id = data.id || data;
			const rooms = [...Object.keys(socket.rooms)];
			const guildId = rooms.find(room => room.includes("guild"))?.split?.("-")?.[1];
			const liveChatId = rooms.filter(room => room.includes("channel"))?.map(id => id.split("-")[1]);

			const modId = data.mod_id;
			const refreshToken = data.refresh_token;

			const modRef = admin.firestore().collection("Streamers").doc(modId).collection("discord").doc("data");
			const modData: any = await modRef.get();
			const modRefreshToken = modData.refreshToken;

			if (modRefreshToken !== refreshToken) throw new Error("Bad Auth");

			const connectGuild = clientManager.discordClient.guilds.resolve(guildId);
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
			let user = data.user || data;
			const guildId = [...Object.keys(socket.rooms)].find(room => room.includes("guild"))?.split?.("-")?.[1];
			const connectGuild = clientManager.discordClient.guilds.resolve(guildId);

			const modId = data.mod_id;
			const refreshToken = data.refresh_token;

			const modRef = admin.firestore().collection("Streamers").doc(modId).collection("discord").doc("data");
			const modData: any = await modRef.get();
			const modRefreshToken = modData.refreshToken;

			if (modRefreshToken !== refreshToken) throw new Error("Bad Auth");

			try {
				connectGuild.members.ban(user, { days: 1 });
			} catch (err) {
				log(err.message, { error: true });
			}
		});

		socket.on("deletemsg - twitch", async data => {
			const TwitchName = [...Object.keys(socket.rooms)].find(room => room.includes("twitch"))?.split?.("-")?.[1];

			function botDelete(id) {
				try {
					clientManager.twitchClient.deletemessage(TwitchName, id);
				} catch (err) {
					log(err.message, { error: true });
				}
			}
			let id = data.id;

			if (!id) {
				botDelete(data);
			} else {
				const modName = data.modName;
				const refreshToken = data.refresh_token;
				if (!refreshToken) {
					botDelete(id);
				} else {
					try {
						let UserClient = await userClientManager.getOrCreate(refreshToken, modName, TwitchName);
						await UserClient.deletemessage(TwitchName, id);
						UserClient = null;
					} catch (err) {
						log(err.message, { error: true });
						botDelete(id);
					}
				}
			}
		});

		socket.on("timeoutuser - twitch", async data => {
			const TwitchName = [...Object.keys(socket.rooms)].find(room => room.includes("twitch"))?.split?.("-")?.[1];

			let user = data.user;
			async function botTimeout(user) {
				log(`Timeout ${user} - Twitch`, { writeToConsole: true });
				try {
					//Possible to do: let default timeouts be assigned in dashboard
					await clientManager.twitchClient.timeout(TwitchName, user, data.time ?? 300);
				} catch (err) {
					log(err.message, { error: true });
				}
			}
			if (!user) {
				botTimeout(data);
			} else {
				const modName = data.modName;
				const refreshToken = data.refresh_token;

				if (!refreshToken) {
					botTimeout(user);
				} else {
					try {
						let UserClient = await userClientManager.getOrCreate(refreshToken, modName, TwitchName);
						await UserClient.timeout(TwitchName, user, data.time ?? 300);
						UserClient = null;
					} catch (err) {
						log(err.message, { error: true });
						botTimeout(user);
					}
				}
			}
		});

		socket.on("banuser - twitch", async data => {
			const TwitchName = [...Object.keys(socket.rooms)].find(room => room.includes("twitch"))?.split?.("-")?.[1];

			let user = data.user;
			async function botBan(user) {
				log(`Ban ${user} - Twitch`, { writeToConsole: true });
				try {
					//Possible to do: let default timeouts be assigned in dashboard
					await clientManager.twitchClient.ban(TwitchName, user, data.time ?? 300);
				} catch (err) {
					log(err.message, { error: true });
				}
			}

			const modName = data.modName;
			const refreshToken = data.refresh_token;

			if (!refreshToken) {
				botBan(user);
			} else {
				try {
					let UserClient = await userClientManager.getOrCreate(refreshToken, modName, TwitchName);
					await UserClient.ban(TwitchName, user);
					UserClient = null;
				} catch (err) {
					log(err.message, { error: true });
					botBan(user);
				}
			}
		});

		socket.on("sendchat", async data => sendChat(data, socket));

		socket.on("disconnect", () => {
			log("a user disconnected");
			log(socket.rooms, { writeToConsole: true });
		});
	});
};
