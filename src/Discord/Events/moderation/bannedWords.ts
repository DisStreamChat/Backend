import { firestore } from "firebase-admin";

import { getDiscordSettings } from "../../../utils/functions";

export default async (message, client) => {
	const settings = await getDiscordSettings({ client, guild: message.guild.id });
	const guildRef = firestore().collection("moderation").doc(message.guild.id);
	const guildDoc = await guildRef.get();
	const guildData = guildDoc.data();
	if (!guildData) return;
	if (guildData.bannedWords) {
		for (const word of guildData.bannedWords) {
			// if (message.content.includes(word)) {
			// 	if (guildData.subtle) {
			// 		informMods(message, guild, client);
			// 	} else {
			// 		message.delete();
			// 		warn(message.member, guild, client);
			// 	}
			// }
		}
	}
};
