import { discordClient } from "../utils/initClients";
import admin from "firebase-admin";
import { SlashCommandObject } from "./DiscordEvents";
import GenerateView from "./Commands/CustomCommands/GenerateView";
import Mustache from "mustache";
import { replaceArgs, replaceFunc } from "./Commands/CustomCommands";
import { EmbedField, MessageEmbed } from "discord.js";

interface SlashCommandDoc extends SlashCommandObject {
	response: string;
	embed: boolean;
	ephemeral: boolean;
	embedSettings?: {
		thumbnail: string;
		title: string;
		author: { name: string; avatar: string };
		fields: EmbedField[];
		color: string;
	};
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
			for (const { response, embed, embedSettings, ephemeral, ...command } of data.commands) {
				await discordClient.registerSlashCommandToGuild(command, guildId, async interaction => {
					const view = GenerateView({ message: interaction, args: [] });
					for (const [key, value] of Object.entries(interaction.arguments)) {
						view[key] = value;
					}
					let text = response.replace(/{(\w+)}/, (match, p1, p2, offset, string) => {
						return interaction.arguments[p1];
					});
					if (ephemeral) interaction.ephemeral();
					text = replaceFunc(text);
					const responseText = Mustache.render(text, view).replace(/&lt;/gim, "<").replace(/&gt;/gim, ">");
					if (!embed) {
						return interaction.reply(responseText);
					}
					const responseEmbed = new MessageEmbed()
						.setAuthor(embedSettings.author.name, embedSettings.author.avatar)
						.setDescription(responseText)
						.setTitle(
							Mustache.render(embedSettings.title, view).replace(/&lt;/gim, "<").replace(/&gt;/gim, ">")
						)
						.setThumbnail(embedSettings.thumbnail)
						.setColor(embedSettings.color)
					if (embedSettings.fields?.length) {
						responseEmbed.addFields(embedSettings.fields);
					}
					interaction.reply(responseEmbed);
				});
			}
		});
	}
};
