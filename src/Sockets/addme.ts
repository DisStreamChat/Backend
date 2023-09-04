import Server from "socket.io";
import Socket from "socketio-promises";

import { Logger } from "../utils/functions/logging";
import { clientManager } from "../utils/initClients";

interface AddMeData {
	TwitchName: string;
	guildId: string;
	liveChatId: string | string[];
}

export async function addMe(message: AddMeData, socket: Server.Socket) {
	Logger.log(`adding: ${JSON.stringify(message)} to: ${socket.id}`);
	const socketWrapper = new Socket(socket);
	let { TwitchName, guildId, liveChatId } = message;
	TwitchName = TwitchName?.toLowerCase?.();

	try {
		const channels = await clientManager.twitchClient.getChannels();
		if (!channels.includes(TwitchName)) {
			await clientManager.twitchClient.join(TwitchName);
			Logger.log("joined channel");
		}
	} catch (err) {
		Logger.error(err);
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
		Logger.error(err);
	} finally {
		Logger.log("finally");
	}
}
