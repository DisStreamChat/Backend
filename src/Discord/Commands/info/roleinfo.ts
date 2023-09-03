import { MessageEmbed } from "discord.js";
import admin from "firebase-admin";

import {
    convertDiscordRoleColor, formatFromNow, getDiscordSettings, resolveRole
} from "../../../utils/functions";

export default {
	name: "roleinfo",
	aliases: ["role-info"],
	id: "roleinfo",
	category: "roles",
	description: "Get information about a role",
	usage: ["<roleping | roleid | rolename>"],
	execute: async (msg, args, bot) => {
		const role = resolveRole(msg, args.join(" "));
		if (!role) return msg.channel.send(":x: Invalid Role");

		const settings = await getDiscordSettings({ guild: msg.guild.id, client: bot });
		const roleGuildRef = await admin.firestore().collection("roleManagement").doc(msg.guild.id).get();
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
		msg.channel.send(embed);
	},
};
