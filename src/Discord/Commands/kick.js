const { MessageEmbed } = require("discord.js");
const { resolveUser } = require("../../utils/functions");

module.exports = {
	name: "kick",
	id: "kick",
	category: "moderation",
	
	aliases: [],
	description: "kick a user",
	usage: ["<user>"],
	permissions: ["MANAGE_SERVER", "BAN_MEMBERS", "ADMINISTRATOR"],
	//TODO: check MANAGE_MESSAGES for the channel not the server
	execute: async (message, args, client) => {
		if (args.length === 0) {
			return await message.channel.send(":x: Missing User");
		}
		let member = resolveUser(message, args.join(" ").replace(/[\\<>@#&!]/g, ""));
		if (!member) {
			return await message.channel.send(":x: Invalid User");
		}
		// if (!member.bannable) {
		// 	return await message.channel.send(new MessageEmbed().setAuthor(`:x: Unable to kick ${member}`, member.user.avatarURL()));
		// }
		const nickname = member.user.username;
		await member.kick();
		const embed = new MessageEmbed()
			.setTitle("Kicked user")
			.setAuthor(client.user.tag, client.user.avatarURL())
			.setDescription(`Kicked **${nickname}**`);
		message.channel.send(embed);
	},
};
