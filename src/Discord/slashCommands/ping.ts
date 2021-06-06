import { MessageEmbed } from "discord.js";
import { SlashCommandInteraction } from "../../clients/discord.client";

export default {
	name: "ping",
	description: "ping the bot",
	execute: (interaction: SlashCommandInteraction) => {
		const { client } = interaction;
		
		let pingembed = new MessageEmbed()
			.setTitle(`🏓 Pong!`)
			.addFields({ name: `${client.user.username}'s Ping:`, value: `${Math.round(client.ws.ping)}ms` });

		interaction.reply({
			embed: pingembed,
			ephemeral: true,
		});
	},
};
