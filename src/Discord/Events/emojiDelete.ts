import { MessageEmbed } from "discord.js";
import setupLogging from "./utils/setupLogging";

export default async (emoji, client) => {
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

		const logChannel = guild.channels.resolve(channelId);

		logChannel.send(embed);
	}
};
