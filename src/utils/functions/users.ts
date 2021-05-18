;

import { Platform } from "../../models/platform.enum";
import { DiscordClient, TwitchApiClient } from "../initClients";

export const getProfilePicture = async (platform: Platform, username: string) => {
	let profilePicture;
	if (platform === Platform.TWITCH) {
		profilePicture = (await TwitchApiClient.getUserInfo(username))["profile_image_url"];
	} else if (platform === Platform.DISCORD) {
		const userObj = await DiscordClient.users.fetch(username);
		profilePicture = userObj.displayAvatarURL({ format: "png" });
	}
	if (!profilePicture) {
		throw new Error("invalid profile picture or platform");
	}
	return profilePicture
};
