import { resolveRole, convertDiscordRoleColor, formatFromNow, getDiscordSettings } from "../../../utils/functions";
const { MessageEmbed } = require("discord.js");

module.exports = {
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
		const description = settings?.roleDescriptions?.[role.id] || "This Role has no description";

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
