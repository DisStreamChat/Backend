import { MessageEmbed } from "discord.js";
import { SlashCommandInteraction } from "../../clients/discord.client";

export default {
	name: "roles",
	description: "list all the roles in this server",
	execute: (interaction: SlashCommandInteraction) => {
		const bot = interaction.client;
		interaction.ephemeral();
		const roles = interaction.guild.roles.cache
			.array()
			.filter(role => !role.managed && role.name !== "@everyone")
			.sort((a, b) => b.rawPosition - a.rawPosition);

		const embed = new MessageEmbed()
			.setAuthor(bot.user.username, bot.user.displayAvatarURL())
			.setThumbnail(interaction.guild.iconURL())
			.setTitle(`Roles in ${interaction.guild.name}`)
			.setDescription(roles.map(role => `${role}\n`).join(""))
			.setColor(roles[0]?.hexColor || "11ee11")
			.setFooter(`Roles: ${roles.length}`)
			.addField("Role Info", "use `/roleinfo` to get extra information about a role")
			.setTimestamp(new Date());
		interaction.reply({ embed });
	},
};
