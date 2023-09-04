import { clientManager } from "../initClients";

export const getProfilePicture = async (
	platform: "twitch" | "discord",
	username: string
): Promise<string | undefined> => {
	if (platform === "twitch") {
		return (await clientManager.twitchApiClient.getUserInfo(username)).profile_image_url;
	} else if (platform === "discord") {
		const userObj = await clientManager.discordClient.users.fetch(username);
		return userObj.displayAvatarURL({ format: "png" });
	}
	throw new Error("invalid profile picture or platform");
};
