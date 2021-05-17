import {firestore} from "firebase-admin";
import { getDiscordSettings, 
	// informMods, 
	// warn, 
	// hasDiscordInviteLink 
} from "../../../utils/functions";
import getUrls from "extract-urls";

export default async (message, client) => {
	const settings = await getDiscordSettings({ client, guild: message.guild.id });
	const guildRef = firestore().collection("moderation").doc(message.guild.id);
	const guildDoc = await guildRef.get();
	const guildData = guildDoc.data();
	if (!guildData) return;
	if (guildData.banInviteLinks) {
		const urls = getUrls(message.content);
		// if (hasDiscordInviteLink(urls)) {
		// 	if (guildData.subtle) {
		// 		informMods(message, guild, client);
		// 	} else {
		// 		message.delete();
		// 		warn(message.member, guild, client);
		// 	}
		// }
	}
};
