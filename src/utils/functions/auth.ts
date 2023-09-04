import fetch from "node-fetch";

import { EnvManager } from "../envManager.util";

export const refreshTwitchToken = async (refresh_token: string) => {
	const apiURL = `https://id.twitch.tv/oauth2/token?client_id=${EnvManager.TWITCH_APP_CLIENT_ID}&client_secret=${EnvManager.TWITCH_CLIENT_SECRET}&grant_type=refresh_token&refresh_token=${refresh_token}`;
	const response = await fetch(apiURL, { method: "POST" });
	const json = await response.json();
	return json;
};
