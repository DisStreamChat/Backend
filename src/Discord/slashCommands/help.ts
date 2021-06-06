import { SlashCommandInteraction } from "../../clients/discord.client";
import { generateHelpMessage } from "../Commands/info/help";

export default {
	name: "help",
	description: "Get helpful information on how to use the bot",
	execute: async (interaction: SlashCommandInteraction) => {
		const { embed, maxPages, component } = await generateHelpMessage({
			message: interaction,
			client: interaction.client,
			custom: false,
			page: 1,
		});
		interaction.reply({ embed });
	},
};
