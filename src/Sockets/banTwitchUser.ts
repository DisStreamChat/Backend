import { Logger } from "../utils/functions/logging";
import { clientManager } from "../utils/initClients";
import { userClientManager } from "./userClientManager";

async function botBan(user: string, channel: string) {
	Logger.log(`Ban ${user} - Twitch`);
	try {
		//Possible to do: let default timeouts be assigned in dashboard
		await clientManager.twitchClient.ban(channel, user);
	} catch (err) {
		Logger.error(err.message);
	}
}

export async function banTwitchUser(data: {
	channel: string;
	user: string;
	modName: string;
	refresh_token: string;
}): Promise<void> {
	const { user, refresh_token: refreshToken, modName, channel } = data;

	if (!refreshToken) {
		botBan(user, channel);
	} else {
		try {
			let UserClient = await userClientManager.getOrCreate(refreshToken, modName, channel);
			await UserClient.ban(channel, user);
			UserClient = null;
		} catch (err) {
			Logger.error(err.message);
			botBan(user, channel);
		}
	}
}
