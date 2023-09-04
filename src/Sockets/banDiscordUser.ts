import admin from "firebase-admin";

import { Logger } from "../utils/functions/logging";
import { clientManager } from "../utils/initClients";

export async function banDiscordUser(data: {
	guildId: string;
	time?: number;
	user: string;
	mod_id: string;
	refresh_token: string;
}) {
	const { mod_id: modId, refresh_token: refreshToken, guildId, user } = data;
	const connectGuild = clientManager.discordClient.guilds.resolve(guildId);

	const modRef = admin
		.firestore()
		.collection("Streamers")
		.doc(modId)
		.collection("discord")
		.doc("data");
	const modData: any = await modRef.get();
	const modRefreshToken = modData.refreshToken;

	if (modRefreshToken !== refreshToken) throw new Error("Bad Auth");

	try {
		connectGuild.members.ban(user, { days: 1 });
	} catch (err) {
		Logger.error(err.message);
	}
}
