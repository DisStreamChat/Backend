import { log } from "../utils/functions/logging";
import { getUserClient } from "./userClients";

// get the initialized clients from another file
import { DiscordClient, twitchClient } from "../utils/initClients";
import admin from "firebase-admin";
import { Server } from "socket.io";
import { DefaultEventsMap } from "socket.io/dist/typed-events";
import { AddEventModel } from "../models/sockets.model";
import { getRooms, leaveAllRooms } from "./utils";

export const sockets = (io: Server<DefaultEventsMap, DefaultEventsMap>) => {
	log("setting up sockets", { writeToConsole: true });
	io.on("connection", socket => {
		log("a user connected", { writeToConsole: true });
		// the addme event is sent from the frontend on load with the data from the database
		socket.on("addme", async (message: AddEventModel) => {
			log(`adding: ${JSON.stringify(message, null, 4)} to: ${socket.id}`, { writeToConsole: true });
			let { twitchName, guildId, liveChatId } = message;
			if (typeof twitchName === "string") {
				twitchName = transformTwitchUsername(twitchName.toLowerCase());
			}
			leaveAllRooms(socket);
			try {
				const channels = twitchClient.channels;
				if (!channels.includes(twitchName)) {
					await twitchClient.join(twitchName);
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
			} catch (err) {
				log(err, { writeToConsole: true, error: true });
			}
		});

		socket.on("deletemsg - discord", async data => {
			let id = data.id || data;
			const rooms = getRooms(socket);
			const guildId = rooms.find(room => room.includes("guild"))?.split?.("-")?.[1];
			const liveChatId = rooms.filter(room => room.includes("channel"))?.map(id => id.split("-")[1]);

			const modId = data.mod_id;
			const refreshToken = data.refresh_token;

			const modRef = admin.firestore().collection("Streamers").doc(modId).collection("discord").doc("data");
			const modData: any = await modRef.get();
			const modRefreshToken = modData.refreshToken;

			if (modRefreshToken !== refreshToken) throw new Error("Bad Auth");

			const connectGuild = DiscordClient.guilds.resolve(guildId);
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
			const guildId = getRooms(socket).find(room => room.includes("guild"))?.split?.("-")?.[1];
			const connectGuild = DiscordClient.guilds.resolve(guildId);

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
			const twitchName = getRooms(socket).find(room => room.includes("twitch"))?.split?.("-")?.[1];

			async function botDelete(id: string){
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
			const twitchName = getRooms(socket).find(room => room.includes("twitch"))?.split?.("-")?.[1];

			let user = data.user;
			async function botTimeout(user: string) {
				log(`Timeout ${user} - Twitch`, { writeToConsole: true });
				try {
					//Possible to do: let default timeouts be assigned in dashboard
					await twitchClient.timeout(twitchName, user, data.time ?? 300);
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
						let UserClient = await getUserClient(refreshToken, modName, twitchName);
						await UserClient.timeout(twitchName, user, data.time ?? 300);
						UserClient = null;
					} catch (err) {
						log(err.message, { error: true });
						botTimeout(user);
					}
				}
			}
		});

		socket.on("banuser - twitch", async data => {
			const twitchName = getRooms(socket).find(room => room.includes("twitch"))?.split?.("-")?.[1];

			let user = data.user;
			async function botBan(user: string) {
				log(`Ban ${user} - Twitch`, { writeToConsole: true });
				try {
					//Possible to do: let default timeouts be assigned in dashboard
					await twitchClient.ban(twitchName, user, data.time ?? 300);
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
			log(`send chat: ${data}`);
			const sender = data.sender;
			const refreshToken = data.refreshToken;
			const message = data.message;
			const twitchName = getRooms(socket).find(room => room.includes("twitch"))?.split?.("-")?.[1];
			if (!refreshToken) {
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
			log("a user disconnected");
			log(socket.rooms, { writeToConsole: true });
		});
	});
};
function transformTwitchUsername(arg0: string): string {
	throw new Error("Function not implemented.");
}
