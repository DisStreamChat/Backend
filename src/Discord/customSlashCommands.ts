import { discordClient } from "../utils/initClients";
import admin from "firebase-admin";
import { SlashCommandObject } from "./DiscordEvents";

interface customSlashCommandDoc {
	commandDetails: SlashCommandObject;
	response: string;
}

export const setupCustomSlashCommands = async () => {
	const collectionRef = await admin.firestore().collection("slashCommands").get();
	const docs = collectionRef.docs;
	for (const doc of docs) {
		doc.ref.onSnapshot(snapshot => {
			const data = snapshot.data() as customSlashCommandDoc;
			if (!data) return;
			const guildId = doc.id;
			discordClient.registerSlashCommandToGuild(data.commandDetails, guildId, async interaction => {
				interaction.reply(data.response)
			});
		});
	}
};
