import admin from "firebase-admin";

import { Logger } from "../utils/functions/logging";
import { clientManager } from "../utils/initClients";

export async function deleteDiscordMessage(data: {
	guildId: string;
	liveChatId: string;
	time?: number;
	user: string;
	mod_id: string;
	refresh_token: string;
	id: string;
}) {
	const { id, mod_id: modId, guildId, liveChatId, refresh_token: refreshToken } = data;

	const modRef = admin
		.firestore()
		.collection("Streamers")
		.doc(modId)
		.collection("discord")
		.doc("data");
	const modData: any = await modRef.get();
	const modRefreshToken = modData.refreshToken;

	if (modRefreshToken !== refreshToken) throw new Error("Bad Auth");

	const connectGuild = clientManager.discordClient.guilds.resolve(guildId);
	const guildChannels = connectGuild.channels;

	for (const channelId of liveChatId) {
		try {
			const liveChatChannel: any = guildChannels.resolve(channelId);
			const messageManager = liveChatChannel.messages;

			const messageToDelete = await messageManager.fetch(id);

			messageToDelete.delete();
		} catch (err) {
			Logger.error(err.message);
		}
	}
}
