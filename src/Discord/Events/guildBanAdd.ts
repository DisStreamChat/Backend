import { Guild, MessageEmbed, TextChannel, User } from "discord.js";
import { DiscordClient } from "../../clients/discord.client";
import { sleep } from "../../utils/functions";
import { writeToAuditLog } from "./utils/auditLog";
import setupLogging from "./utils/setupLogging";

export default async (guild: Guild, user: User, client: DiscordClient) => {
	await sleep(2000);
	const auditLog = await guild.fetchAuditLogs();

	const banAction = auditLog.entries.first();

	let executor: User = null;
	if (banAction.action === "MEMBER_BAN_ADD") {
		executor = banAction.executor;
	}

	const [channelIds, active] = await setupLogging(guild, "MemberBanned", client);
	if (!active) return;

	const embed = new MessageEmbed()
		.setAuthor(executor?.tag, executor?.avatarURL())
		.setThumbnail(user.displayAvatarURL())
		.setTitle("Member Banned")
		.setDescription(`:outbox_tray: ${user} **Was Banned** by ${executor || "unknown"}`)
		.setFooter(`ID: ${user.id}`)
		.setTimestamp(new Date())
		.setColor("#ee1111");

	for (const channelId of channelIds) {
		if (!channelId) return;
		const logChannel = guild.channels.resolve(channelId) as TextChannel;

		logChannel.send(embed);
	}
	// if(isPremium(guild))
	writeToAuditLog(guild, "user banned", { user, executor });
};
