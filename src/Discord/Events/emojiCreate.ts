import { Emoji, GuildEmoji, MessageEmbed, TextChannel } from "discord.js";
import { DiscordClient } from "../../clients/discord.client";
import { isPremium } from "../../utils/functions";
import { writeToAuditLog } from "./utils/auditLog";
import setupLogging from "./utils/setupLogging";

export default async (emoji: GuildEmoji, client: DiscordClient) => {
	const guild = emoji.guild;
	if (!guild) return;

	const [channelIds, active] = await setupLogging(guild, "emojiCreate", client);
	if (!active) return;

	const createdBy = await emoji.fetchAuthor();

	const embed = new MessageEmbed()
		.setAuthor(createdBy.tag, createdBy.avatarURL())
		.setThumbnail(`https://cdn.discordapp.com/emojis/${emoji.id}.${emoji.animated ? "gif" : "png"}?v=1`)
		.setDescription(`:inbox_tray: The emoji: ${emoji} **was created**`)
		.setFooter(`ID: ${emoji.id}`)
		.setTimestamp(new Date())
		.setColor("#11ee11");

	for (const channelId of channelIds) {
		if (!channelId) return;

		const logChannel = guild.channels.resolve(channelId) as TextChannel;

		logChannel.send(embed);
	}
	if (await isPremium(guild)) {
		writeToAuditLog(guild, "channel created", { emoji });
	}
};
