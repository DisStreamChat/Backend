import { MessageEmbed } from "discord.js";

// import { DiscordClient } from "../../utils/initClients";

export const getDmEmbed = ({ user = {}, action, role, DiscordClient }) =>
	new MessageEmbed()
		.setTitle(`Role ${action === "add" ? "Added" : "Removed"}`)
		.setAuthor(DiscordClient.user.tag, DiscordClient.user.displayAvatarURL())
		.setDescription(`${action === "add" ? "Added" : "Removed"} the Role **${role.name}**`)
		.addField("Server", role.guild.name)
		.setThumbnail(role.guild.iconURL())
		.setTimestamp(new Date())
		.setColor(role.hexColor === "#000000" ? "#FFFFFF" : role.hexColor);

export const removeRole = async ({ member, role, DMuser, DiscordClient }) => {
	await member.roles.remove(role);
	if (DMuser) {
		const embed = getDmEmbed({ role, action: "remove", DiscordClient });
		await member.user.send(embed);
	}
};

export const addRole = async ({ member, role, DMuser, DiscordClient }) => {
	await member.roles.add(role);
	if (DMuser) {
		const embed = getDmEmbed({ role, action: "add", DiscordClient });
		await member.user.send(embed);
	}
};

export default {
	getDmEmbed,
	removeRole,
	addRole,
};
