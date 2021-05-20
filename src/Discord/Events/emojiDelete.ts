import { GuildEmoji, MessageEmbed, TextChannel } from "discord.js";
import { DiscordClient } from "../../clients/discord.client";
import setupLogging from "./utils/setupLogging";

export default async (emoji: GuildEmoji, client: DiscordClient) => {
	const guild = emoji.guild;
	if (!guild) return;

	const [channelIds, active] = await setupLogging(guild, "emojiDelete", client);
	if (!active) return;

	const embed = new MessageEmbed()
		.setAuthor("DisStreamBot")
		.setThumbnail(`https://cdn.discordapp.com/emojis/${emoji.id}.${emoji.animated ? "gif" : "png"}?v=1`)
		.setDescription(`:outbox_tray: The emoji: ${emoji} **was deleted**`)
		.setFooter(`ID: ${emoji.id}`)
		.setTimestamp(new Date())
		.setColor("#ee1111");

	for (const channelId of channelIds) {
		if (!channelId) return;

		const logChannel = guild.channels.resolve(channelId) as TextChannel;

		logChannel.send(embed);
	}
};
