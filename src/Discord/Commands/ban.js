const { MessageEmbed } = require("discord.js");
const { resolveUser, formatFromNow } = require("../../utils/functions");

module.exports = {
	name: "ban",
	aliases: [],
	description: "Ban a user",
	usage: ["<user>"],
	permissions: ["MANAGE_SERVER", "BAN_MEMBERS", "ADMINISTRATOR"],
	//TODO: check MANAGE_MESSAGES for the channel not the server
	execute: async (message, args, client) => {
		if (args.length === 0) {
			return await message.channel.send(":x: Missing User");
		}
		let member = resolveUser(message, args.join(" "));
		if (!member.bannable) {
			return await message.channel.send(new MessageEmbed().setAuthor(`:x: Unable to ban ${member}`, member.user.avatarURL()));
        }
        const nickname = member.user.username
		await member.ban();
		const embed = new MessageEmbed()
			.setTitle("Banned user")
			.setAuthor(client.user.tag, client.user.avatarURL())
			.setDescription(`Banned **${nickname}**`);
		message.channel.send(embed);
	},
};
