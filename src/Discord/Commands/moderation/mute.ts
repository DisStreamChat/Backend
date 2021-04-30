import { MessageEmbed } from "discord.js";
import { resolveUser } from "../../../utils/functions";
import { getDiscordSettings } from "../../../utils/functions";
import { log } from "../../../utils/functions/logging";

const timeMap = {
	s: 1000,
	m: 60000,
	h: 3.6e6,
	d: 8.64e7,
};

export default {
	name: "mute",
	id: "mute",
	category: "moderation",
	aliases: [],
	description: "mute a user",
	usage: ["<user>"],
	permissions: ["MANAGE_SERVER", "BAN_MEMBERS", "ADMINISTRATOR"],
	//TODO: check MANAGE_MESSAGES for the channel not the server
	execute: async (message, args, client) => {
		// TODO: remove to make public
		try {
			if (args.length === 0) {
				return await message.channel.send(":x: Missing User");
			}
			if (args.length === 1) {
				return await message.channel.send(
					":x: How long should I mute them? for example, 10s (10 seconds), 5m (5 minutes), 1h (1 hour), 2d (2 days)"
				);
			}

			let member = await resolveUser(
				message,
				args
					.slice(0, -1)
					.join(" ")
					.replace(/[\\<>@#&!]/g, "")
			);
			if (!member) {
				return await message.channel.send(":x: Invalid User");
			}
			const nickname = member.user.username;
			const settings = await getDiscordSettings({ guild: message.guild.id, client });
			const mutedRole = await message.guild.roles.fetch(settings.mutedRole);
			await member.roles.add(mutedRole);

			const muteTime = args[args.length - 1];
			const unit = muteTime.slice(-1);
			const duration = +muteTime.slice(0, -1);
			const muteTimeMillis = duration * timeMap[unit];

			setTimeout(() => {
				member.roles.remove(mutedRole);
			}, muteTimeMillis);

			const embed = new MessageEmbed()
				.setTitle("Muted user")
				.setAuthor(client.user.tag, client.user.avatarURL())
				.setDescription(`Muted **${nickname}** for ${args[1]}`);
			message.channel.send(embed);
		} catch (err) {
			log(err.message, { error: true });
		}
	},
};
