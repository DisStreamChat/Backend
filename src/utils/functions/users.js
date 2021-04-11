require("dotenv").config();

import { DiscordClient, TwitchApiClient } from "../initClients";

export const getProfilePicture = async (platform, username) => {
	let profilePicture;
	if (platform === "twitch") {
		profilePicture = (await TwitchApiClient.getUserInfo(user))["profile_image_url"];
	} else if (platform === "discord") {
		const userObj = await DiscordClient.users.fetch(user);
		profilePicture = userObj.displayAvatarURL({ format: "png" });
	}
	if (!profilePicture) {
		throw new Error("invalid profile picture or platform");
	}
	return profilePicture
};
