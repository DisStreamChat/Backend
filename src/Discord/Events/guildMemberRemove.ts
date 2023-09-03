import { MessageEmbed } from "discord.js";

import setupLogging from "./utils/setupLogging";

export default async (member, client) => {
	const guild = member.guild;

	const [channelIds, active] = await setupLogging(guild, "MemberRemove", client);
	if (!active) return;

	const embed = new MessageEmbed()
		.setAuthor(member.user.tag, member.user.displayAvatarURL())
		.setThumbnail(member.user.displayAvatarURL())
		.setDescription(`:outbox_tray: ${member} **left the server**`)
		.setFooter(`ID: ${member.id}`)
		.setTimestamp(new Date())
		.setColor("#ee1111");

	for (const channelId of channelIds) {
		if (!channelId) return;
		const logChannel = guild.channels.resolve(channelId);

		logChannel.send(embed);
	}
};
