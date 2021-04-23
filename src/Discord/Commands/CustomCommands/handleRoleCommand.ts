import { MessageEmbed } from "discord.js";

export default async (command, message, client) => {
	const member = message.member;
	const author = message.author;
	const roles = member.roles;
	const commandRoles = command.role || command.roles;
	const rolesToGive = (Array.isArray(commandRoles) ? commandRoles : [commandRoles]).map(role => role.id || role);
	const roleIds = roles.cache.array().map(role => role.id);
	for (const roleToGive of rolesToGive) {
		console.log(roleToGive)
		const memberHasRole = roles.cache.get(roleToGive);
		const roleObj = await message.guild.roles.fetch(roleToGive);
		let action;
		if (memberHasRole) {
			await roles.remove(roleToGive);
			action = "Removed";
		} else {
			await roles.add(roleToGive);
			action = "Gave";
		}
		let embed = new MessageEmbed()
			.setDescription(`${action} Role **${roleObj}** ${action === "Removed" ? "from" : "to"} ${member}`)
			.setAuthor(client.user.tag, client.user.avatarURL())
			.setColor(roleObj.hexColor);
		if (command.DM) {
			embed.setDescription(`${action} Role **${roleObj.name}** ${action === "Removed" ? "from" : "to"} ${member}`);
			return await message.author.send(embed);
		}
		const notification = await message.channel.send(embed);
		if (command.deleteUsage) {
			setTimeout(() => {
				notification.delete();
				message.delete();
			}, 2500);
		}
	}
};
