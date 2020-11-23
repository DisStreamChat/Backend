const { MessageEmbed } = require("discord.js");
const { resolveUser, formatFromNow } = require("../../utils/functions");

module.exports = {
	name: "ban",
	id: "ban",
	category: "moderation",
	aliases: [],
	description: "Ban a user",
	usage: ["<user>"],
	permissions: ["MANAGE_SERVER", "BAN_MEMBERS", "ADMINISTRATOR"],
	execute: async (message, args, client) => {
		if (args.length === 0) {
			return await message.channel.send(":x: Missing User");
        }
        // user = await message.guild.fetchBan(args[0].replace(/[\\<>@#&!]/g, ""))
        let member = resolveUser(message, args.join(" ").replace(/[\\<>@#&!]/g, ""));
        console.log(member)
		if (!member.bannable) {
			return await message.channel.send(new MessageEmbed().setDescription(`:x: Unable to ban ${member}`));
		}
		const nickname = member.user.username;
		await member.ban();
		const embed = new MessageEmbed()
			.setTitle("Banned user")
			.setAuthor(client.user.tag, client.user.avatarURL())
			.setDescription(`Banned **${nickname}**`);
		message.channel.send(embed);
	},
};
