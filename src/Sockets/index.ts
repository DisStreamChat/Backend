import Socket from "socketio-promises";
import { log } from "../utils/functions/logging";
import { getUserClient } from "./userClients";

// get the initialized clients from another file
import { DiscordClient, TwitchClient } from "../utils/initClients";
import admin from "firebase-admin";
import Server from "socket.io";

export const sockets = (io: Server.Server) => {
	log("setting up sockets", { writeToConsole: true });

	io.origins((_, callback) => {
		callback(null, true);
	});
	io.on("connection", socket => {
		log("a user connected", { writeToConsole: true });
		const socketWrapper = new Socket(socket);
		socket.emit("imConnected");

		// the addme event is sent from the frontend on load with the data from the database
		socket.on("addme", async message => {
			log(`adding: ${JSON.stringify(message)} to: ${socket.id}`, { writeToConsole: true });
			let { TwitchName, guildId, liveChatId } = message;
			TwitchName = TwitchName?.toLowerCase?.();

			try {
				const channels = await TwitchClient.getChannels();
				if (!channels.includes(TwitchName)) {
					await TwitchClient.join(TwitchName);
					console.log("joined channel");
				}
			} catch (err) {
				log(err, { writeToConsole: true, error: true });
			}

			try {
				if (TwitchName) await socketWrapper.join(`twitch-${TwitchName}`);
				if (guildId) await socketWrapper.join(`guild-${guildId}`);
				if (liveChatId) {
					if (liveChatId instanceof Array) {
						for (const id of liveChatId) {
							await socketWrapper.join(`channel-${id}`);
						}
					} else {
						await socketWrapper.join(`channel-${liveChatId}`);
					}
				}
			} catch (err) {
				log(err, { writeToConsole: true, error: true });
			} finally {
				console.log("finally");
			}
		});

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
			const guildId = [...Object.keys(socket.rooms)].find(room => room.includes("guild"))?.split?.("-")?.[1];
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
			const TwitchName = [...Object.keys(socket.rooms)].find(room => room.includes("twitch"))?.split?.("-")?.[1];

			function botDelete(id) {
				try {
					TwitchClient.deletemessage(TwitchName, id);
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
						let UserClient = await getUserClient(refreshToken, modName, TwitchName);
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
					await TwitchClient.timeout(TwitchName, user, data.time ?? 300);
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
						let UserClient = await getUserClient(refreshToken, modName, TwitchName);
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
					await TwitchClient.ban(TwitchName, user, data.time ?? 300);
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
					let UserClient = await getUserClient(refreshToken, modName, TwitchName);
					await UserClient.ban(TwitchName, user);
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
			const TwitchName = [...Object.keys(socket.rooms)].find(room => room.includes("twitch"))?.split?.("-")?.[1];
			if (!refreshToken) {
				throw new Error("no auth");
			}
			if (sender && message) {
				try {
					let UserClient = await getUserClient(refreshToken, sender, TwitchName);
					try {
						await UserClient.join(TwitchName);
						await UserClient.say(TwitchName, message);
					} catch (err) {
						await UserClient.say(TwitchName, message);
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
