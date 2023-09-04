import { Logger } from "../utils/functions/logging";
import { clientManager } from "../utils/initClients";
import { userClientManager } from "./userClientManager";

async function botTimeout(user: string, channel: string, duration: number) {
	Logger.log(`Timeout ${user} - Twitch`);
	try {
		//Possible to do: let default timeouts be assigned in dashboard
		await clientManager.twitchClient.timeout(channel, user, duration);
	} catch (err) {
		Logger.error(err.message);
	}
}

export async function timeoutTwitchUser(data: {
	channel: string;
	time?: number;
	user: string;
	modName: string;
	refresh_token: string;
}): Promise<void> {
	const twitchChannel = data.channel;

	const timeoutDuration = Number(data.time ?? 300);

	let user = data.user;

	if (!user) {
		botTimeout(user, twitchChannel, timeoutDuration);
	} else {
		const modName = data.modName;
		const refreshToken = data.refresh_token;

		if (!refreshToken) {
			botTimeout(user, twitchChannel, timeoutDuration);
		} else {
			try {
				let UserClient = await userClientManager.getOrCreate(
					refreshToken,
					modName,
					twitchChannel
				);
				await UserClient.timeout(twitchChannel, user, timeoutDuration);
				UserClient = null;
			} catch (err) {
				Logger.error(err.message);
				botTimeout(user, twitchChannel, timeoutDuration);
			}
		}
	}
}
