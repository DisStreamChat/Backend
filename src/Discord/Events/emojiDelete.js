import admin from "firebase-admin";
import { MessageEmbed } from "discord.js";
import setupLogging from "./utils/setupLogging";

module.exports = async emoji => {
    const guild = emoji.guild;
    if(!guild) return

    const [channelId, active] = await setupLogging(guild, "emojiDelete", client)
    if(!active) return

	const embed = new MessageEmbed()
        .setAuthor("DisStreamBot")
        .setThumbnail(`https://cdn.discordapp.com/emojis/${emoji.id}.${emoji.animated ? "gif" : "png"}?v=1`)
		.setDescription(`:outbox_tray: The emoji: ${emoji} **was deleted**`)
		.setFooter(`ID: ${emoji.id}`)
		.setTimestamp(new Date())
		.setColor("#ee1111");

	if (!channelId) return;

	const logChannel = guild.channels.resolve(channelId);

	logChannel.send(embed);
};