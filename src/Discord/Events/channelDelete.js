import admin from "firebase-admin";
import { MessageEmbed } from "discord.js";
import setupLogging from "./utils/setupLogging";

module.exports = async (channel, client) => {
	const guild = channel.guild;

    const [channelId, active] = await setupLogging(guild, "channelDelete")
    if(!active) return

	let parentCheck = '';
	if (channel.parentID) {
		parentCheck = `(Parent ID: ${channel.parentID})`
	}

	const embed = new MessageEmbed()
		//.setAuthor(member.user.tag, member.user.displayAvatarURL())
		//.setThumbnail(member.user.displayAvatarURL())
		.setDescription(`:outbox_tray: ${channel.name} **channel deleted**`)
		.setFooter(`ID: ${channel.id} ${parentCheck}`)
		.setTimestamp(new Date())
		.setColor("#ee1111");

	if (!channelId) return;
	const logChannel = guild.channels.resolve(channelId);

	logChannel.send(embed);
};