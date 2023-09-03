import { MessageEmbed } from "discord.js";

import { resolveUser } from "../../../utils/functions";

export default {
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
		let member = await resolveUser(message, args.join(" ").replace(/[\\<>@#&!]/g, ""));
		if (!member?.bannable) {
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
