import { discordClient } from "../utils/initClients";
import admin from "firebase-admin";
import { SlashCommandObject } from "./DiscordEvents";
import GenerateView from "./Commands/CustomCommands/GenerateView";
import Mustache from "mustache";
import { replaceArgs, replaceFunc } from "./Commands/CustomCommands";

interface SlashCommandDoc extends SlashCommandObject {
	response: string;
}

interface customSlashCommandDoc {
	commands: SlashCommandDoc[];
}

export const setupCustomSlashCommands = async () => {
	const collectionRef = await admin.firestore().collection("slashCommands").get();
	const docs = collectionRef.docs;
	for (const doc of docs) {
		doc.ref.onSnapshot(async snapshot => {
			const data = snapshot.data() as customSlashCommandDoc;
			if (!data) return;
			const guildId = doc.id;
			for (const { response, ...command } of data.commands) {
				await discordClient.registerSlashCommandToGuild(command, guildId, async interaction => {
					const view = GenerateView({ message: interaction, args: [] });
					for(const [key, value] of Object.entries(interaction.arguments)){
						view[key] = value
					}
					let text = response.replace(/{(\w+)}/, (match, p1, p2, offset, string) => {
						console.log(p1, p2)
						return interaction.arguments[p1];
					});
					text = replaceFunc(text);
					console.log(text);
					interaction.reply(Mustache.render(text, view).replace(/&lt;/gim, "<").replace(/&gt;/gim, ">"));
				});
			}
		});
	}
};
