import { MessageEmbed } from "discord.js";

import setupLogging from "./utils/setupLogging";

export default async (guild, user, client) => {
	const auditLog = await guild.fetchAuditLogs();

	const deleteAction = await auditLog.entries.first();

	const executor = deleteAction.executor;

	const [channelIds, active] = await setupLogging(guild, "MemberUnBanned", client);
	if (!active) return;

	const embed = new MessageEmbed()
		.setAuthor(executor.tag, executor.avatarURL())
		.setThumbnail(user.displayAvatarURL())
		.setTitle("Member Unbanned")
		.setDescription(`:inbox_tray: ${user} **Was Unbanned** by ${executor}`)
		.setFooter(`ID: ${user.id}`)
		.setTimestamp(new Date())
		.setColor("#11ee11");

	for (const channelId of channelIds) {
		if (!channelId) return;
		const logChannel = guild.channels.resolve(channelId);

		logChannel.send(embed);
	}
};
