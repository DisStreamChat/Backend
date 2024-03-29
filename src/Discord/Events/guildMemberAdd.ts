import { MessageEmbed } from "discord.js";

import { formatFromNow } from "../../utils/functions";
import welcomeMessage from "./misc/WelcomeMessage";
import setupLogging from "./utils/setupLogging";

export default async (member, client) => {
	const guild = member.guild;
	welcomeMessage(guild, member, client);
	const [channelIds, active] = await setupLogging(guild, "MemberAdd", client);
	if (!active) return;

	const embed = new MessageEmbed()
		.setAuthor(member.user.tag, member.user.displayAvatarURL())
		.setThumbnail(member.user.displayAvatarURL())
		.setDescription(`:inbox_tray: ${member} **joined the server**`)
		.addField("Account Created", formatFromNow(member.user.createdAt))
		.setFooter(`ID: ${member.id}`)
		.setTimestamp(new Date())
		.setColor("#11ee11");

	for (const channelId of channelIds) {
		if (!channelId) return;
		const logChannel = guild.channels.resolve(channelId);

		logChannel.send(embed);
	}
};
