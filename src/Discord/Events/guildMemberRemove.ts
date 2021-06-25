import { GuildMember, MessageEmbed, TextChannel } from "discord.js";
import { DiscordClient } from "../../clients/discord.client";
import { writeToAuditLog } from "./utils/auditLog";
import setupLogging from "./utils/setupLogging";

export default async (member: GuildMember, client: DiscordClient) => {
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
		const logChannel = guild.channels.resolve(channelId) as TextChannel;

		logChannel.send(embed);
	}
	// if(isPremium(guild))
	writeToAuditLog(guild, "member left", {member })
};
