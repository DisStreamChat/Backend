const { MessageEmbed } = require("discord.js");
const { ArrayAny } = require("../../../utils/functions");
// the admin app has already been initialized in routes/index.js
const admin = require("firebase-admin");

module.exports = async (command, message, client) => {
	const member = message.member;
	const author = message.author;
	const roles = member.roles;
    const roleToGive = command.role;
    const roleIds = roles.cache.array().map(role => role.id)
	if (command.permittedRoles?.length) {
		if (!ArrayAny(command.permittedRoles, roleIds)) {
			return await message.channel.send(":x: You don't have permission to use this command");
		}
	}
	if (command.bannedRoles?.length) {
		if (ArrayAny(command.bannedRoles, roleIds)) {
			return await message.channel.send(":x: You don't have permission to use this command");
		}
	}
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
	await message.channel.send(embed);
};
