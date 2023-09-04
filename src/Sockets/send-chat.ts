import { log } from "../utils/functions/logging";
import { userClientManager } from "./userClientManager";

interface sendChatData {
	sender: any;
	refreshToken: string;
	message: string;
	channel: string;
}

export async function sendChat(data: sendChatData): Promise<void> {
	log(`send chat: ${data}`);
	const { sender, message, channel, refreshToken } = data;
	if (!refreshToken) {
		throw new Error("no auth");
	}
	if (sender && message) {
		try {
			let UserClient = await userClientManager.getOrCreate(refreshToken, sender, channel);
			try {
				await UserClient.join(channel);
				await UserClient.say(channel, message);
			} catch (err) {
				await UserClient.say(channel, message);
			}
		} catch (err) {
			log(err.message, { error: true });
		}
	}
}
