import { MessageEmbed } from "discord.js";

export default {
	name: "serverInfo",
	aliases: ["server-info", "serverinfo"],
	id: "server-info",
	category: "info",
	description: "Get information about the server",
	execute: async (message, args, client) => {
		const guild = message.guild;
		const owner = guild.owner;

		const embed = new MessageEmbed()
			.setAuthor(guild.name, guild.iconURL())
			.setTitle(`Info about ${guild.name}`)
			.addField("Owner", owner, true)
			.addField("Partnered", guild.partnered ? "Yes" : "No", true)
			.addField("Region", guild.region, true)
			.addField("Categories", [...new Set(guild.channels.cache.array().map(channel => channel.parentID))].length, true)
			.addField("Text Channels", guild.channels.cache.array().filter(channel => channel.type === "text").length, true)
			.addField("Voice Channels", guild.channels.cache.array().filter(channel => channel.type === "voice").length, true)
			.addField("Members", guild.memberCount, true)
			.addField(
				`Roles - ${guild.roles.cache.array().length}`,
				guild.roles.cache
					.array()
					.filter(role => !role.managed && role.name !== "@everyone")
					.sort((a, b) => b.rawPosition - a.rawPosition)
					.join(", ")
			)
			.setFooter(`ID: ${guild.id} | Server Created`)
			.setTimestamp(guild.createdAt);

		message.channel.send(embed);
	},
};
