import admin from "firebase-admin";
import { MessageEmbed } from "discord.js";
import setupLogging from "./utils/setupLogging";

module.exports = async (member, client) => {
	const guild = member.guild;

    const [channelId, active] = await setupLogging(guild, "MemberRemove", client)
    if(!active) return

	const embed = new MessageEmbed()
		.setAuthor(member.user.tag, member.user.displayAvatarURL())
		.setThumbnail(member.user.displayAvatarURL())
		.setDescription(`:outbox_tray: ${member} **left the server**`)
		.setFooter(`ID: ${member.id}`)
		.setTimestamp(new Date())
		.setColor("#ee1111");

	if (!channelId) return;
	const logChannel = guild.channels.resolve(channelId);

	logChannel.send(embed);
};
