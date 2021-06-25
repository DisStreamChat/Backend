import { Invite, MessageEmbed, TextChannel } from "discord.js";
import { DiscordClient } from "../../clients/discord.client";
import { isPremium } from "../../utils/functions";
import { writeToAuditLog } from "./utils/auditLog";
import setupLogging from "./utils/setupLogging";

export default async (invite: Invite, client: DiscordClient) => {
	const guild = invite.guild;
	if (!guild) return;

	const [channelIds, active] = await setupLogging(guild, "InviteCreate", client);
	if (!active) return;

	const embed = new MessageEmbed()
		.setAuthor("DisStreamBot")
		.setDescription(`:inbox_tray: The invite: ${invite.url} **was created**`)
		.setFooter(`Code: ${invite.code}`)
		.setTimestamp(new Date())
		.setColor("#11ee11");

	for (const channelId of channelIds) {
		if (!channelId) return;

		const logChannel = guild.channels.resolve(channelId) as TextChannel;

		logChannel.send(embed);
	}
	if (await isPremium(guild)) {
		writeToAuditLog(guild, "invite created", { invite });
	}
};
