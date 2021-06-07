import { MessageEmbed } from "discord.js";
import { SlashCommandInteraction } from "../../clients/discord.client";
import { resolveRole, getDiscordSettings, formatFromNow, convertDiscordRoleColor } from "../../utils/functions";
import admin from "firebase-admin";

export default {
	name: "roleinfo",
	description: "get info about a role",
	options: [
		{
			name: "role",
			description: "the id or name of the role you want info about",
			type: 3,
			required: true,
		},
	],
	execute: async (interaction: SlashCommandInteraction) => {
		const role = resolveRole(null, interaction.arguments.role, interaction.guild);
		interaction.ephemeral()
		if (!role) return interaction.reply(":x: Invalid Role");
		const bot = interaction.client;

		const settings = await getDiscordSettings({ guild: interaction.guild.id, client: bot });
		const roleGuildRef = await admin.firestore().collection("roleManagement").doc(interaction.guild.id).get();
		const roleData = roleGuildRef.data();
		const descriptions = roleData?.descriptions?.roles;
		const description = descriptions?.[`${role.id}=${JSON.stringify(role)}`] || "This Role has no description";

		const createdAt = formatFromNow(role.createdAt);

		const embed = new MessageEmbed()
			.setAuthor(bot.user.username, bot.user.displayAvatarURL())
			.setTitle(`Info about ${role.name}`)
			.setDescription(description)
			.setColor(convertDiscordRoleColor(role.hexColor))
			.addField("Name", role.name, true)
			.addField("Mention", `\`${role}\``, true)
			.addField("Color", convertDiscordRoleColor(role.hexColor), true)
			.addField("Mentionable", role.mentionable ? "Yes" : "No", true)
			.addField("Hoisted", role.hoist ? "Yes" : "No", true)
			.addField("Position", role.position, true)
			.addField("Created", createdAt, true)
			.setFooter(`ID: ${role.id}`)
			.setTimestamp(new Date());
		interaction.reply({ embed });
	},
};
