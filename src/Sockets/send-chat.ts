import Server from "socket.io";
import Socket from "socketio-promises";

import { log } from "../utils/functions/logging";
import { userClientManager } from "./userClientManager";

interface sendChatData {
	sender: any;
	refreshToken: string;
	message: string;
}

export async function sendChat(data: sendChatData, socket: Server.Socket): Promise<void> {
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
			let UserClient = await userClientManager.getOrCreate(refreshToken, sender, TwitchName);
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
}
