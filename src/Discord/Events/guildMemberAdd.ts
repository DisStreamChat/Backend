import { formatFromNow, isPremium } from "../../utils/functions";
import { GuildMember, MessageEmbed, TextChannel } from "discord.js";
import setupLogging from "./utils/setupLogging";
import welcomeMessage from "./misc/WelcomeMessage";
import { writeToAuditLog } from "./utils/auditLog";
import { DiscordClient } from "../../clients/discord.client";

export default async (member: GuildMember, client: DiscordClient) => {
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
		const logChannel = guild.channels.resolve(channelId) as TextChannel;

		logChannel.send(embed);
	}
	if (await isPremium(guild)) {
		writeToAuditLog(guild, "member joined", { member });
	}
};
