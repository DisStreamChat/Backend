import { SlashCommandInteraction } from "../../clients/discord.client";
import prettyMs from "pretty-ms";

export default {
	name: "uptime",
	description: "get the bots uptime",
	execute: (interaction: SlashCommandInteraction) => {
		interaction.reply(`**DisStreamBot** has been up for: ${prettyMs(interaction.client.uptime)}`);
	},
};
