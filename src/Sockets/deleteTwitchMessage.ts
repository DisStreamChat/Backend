import { Logger } from "../utils/functions/logging";
import { clientManager } from "../utils/initClients";
import { userClientManager } from "./userClientManager";

function botDelete(id: string, channel: string) {
	try {
		clientManager.twitchClient.deletemessage(channel, id);
	} catch (err) {
		Logger.log(err.message);
	}
}

export async function deleteTwitchMessage(data: {
	channel: string;
	time?: number;
	user: string;
	modName: string;
	refresh_token: string;
	id: string;
}) {
	const { id, modName, refresh_token: refreshToken, channel } = data;

	if (!refreshToken) {
		botDelete(id, channel);
	} else {
		try {
			let UserClient = await userClientManager.getOrCreate(refreshToken, modName, channel);
			await UserClient.deletemessage(channel, id);
			UserClient = null;
		} catch (err) {
			Logger.error(err.message);
			botDelete(id, channel);
		}
	}
}
