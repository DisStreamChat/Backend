import { MessageEmbed } from "discord.js";
import { DiscordClient } from "../../utils/initClients";

const getDmEmbed = ({ user, action, role }) =>
	new MessageEmbed()
		.setTitle(`Role ${action === "add" ? "Added" : "Removed"}`)
		.setAuthor(DiscordClient.user.tag, DiscordClient.user.displayAvatarURL())
		.setDescription(`${action === "add" ? "Added" : "Removed"} the Role **${role.name}**`)
		.setTimestamp(new Date());

module.exports = {
	getDmEmbed,
	removeRole: async ({ member, role, DMuser }) => {
		await member.roles.remove(role);
		if (DMuser) {
			const embed = GetDmEmbed({ user, role, action: "remove" });
			await member.user.send(embed);
		}
	},
	addRole: async ({ member, role, DMuser }) => {
		await member.roles.add(role);
		if (DMuser) {
			const embed = GetDmEmbed({ user, role, action: "add" });
			await member.user.send(embed);
		}
	},
};
