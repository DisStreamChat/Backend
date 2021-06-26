import fetch from "fetchio-js";
import { config } from "../env";

export const refreshTwitchToken = async (refresh_token: string) => {
	const apiURL = `https://id.twitch.tv/oauth2/token?client_id=${config.TWITCH_APP_CLIENT_ID}&client_secret=${
		config.CLIENT_SECRET}&grant_type=refresh_token&refresh_token=${refresh_token}`;
	const response = await fetch(apiURL, { method: "POST" });
	return response;
};
