const { MessageEmbed } = require("discord.js");
const { resolveUser, formatFromNow } = require("../../utils/functions");

module.exports = {
	name: "unban",
	aliases: [],
	description: "Unban a user",
	usage: ["<user>"],
	permissions: ["MANAGE_SERVER", "BAN_MEMBERS", "ADMINISTRATOR"],
	//TODO: check MANAGE_MESSAGES for the channel not the server
	execute: async (message, args, client) => {
		if (args.length === 0) {
			return await message.channel.send(":x: Missing User");
        }
        let user
		try {
			user = (await message.guild.fetchBan(args[0].replace(/[\\<>@#&!]/g, "")))?.user;
			if (!user) {
				return await message.channel.send(":x: User was not banned or doesn't exist");
			}
		} catch (err) {
			return await message.channel.send(":x: User was not banned or doesn't exist");
        }
        console.log(user)
		const nickname = user.username;
		await message.guild.members.unban(user.id);
		const embed = new MessageEmbed()
			.setTitle("Unbanned user")
			.setAuthor(client.user.tag, client.user.avatarURL())
			.setDescription(`Unbanned **${nickname}**`);
		message.channel.send(embed);
	},
};
