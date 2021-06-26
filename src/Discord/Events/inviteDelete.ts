import { MessageEmbed } from "discord.js";
import { isPremium } from "../../utils/functions";
import { writeToAuditLog } from "./utils/auditLog";
import setupLogging from "./utils/setupLogging";

export default async (invite, client) => {
	const guild = invite.guild;
	if (!guild) return;

	const [channelIds, active] = await setupLogging(guild, "InviteDelete", client);
	if (!active) return;

	const embed = new MessageEmbed()
		.setAuthor("DisStreamBot")
		.setDescription(`:outbox_tray: The invite: ${invite.url} **was deleted**`)
		.setFooter(`Code: ${invite.code}`)
		.setTimestamp(new Date())
		.setColor("#ee1111");

	for (const channelId of channelIds) {
		if (!channelId) return;

		const logChannel = guild.channels.resolve(channelId);

		logChannel.send(embed);
	}
	if (await isPremium(guild)) {
		writeToAuditLog(guild, "invite deleted", { invite });
	}
};
