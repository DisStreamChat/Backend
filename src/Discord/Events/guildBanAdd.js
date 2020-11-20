import admin from "firebase-admin";
import { MessageEmbed } from "discord.js";
import {sleep} from "../../utils/functions"
import setupLogging from "./utils/setupLogging";

module.exports = async (guild, user) => {
    await sleep(1000)
	const auditLog = await guild.fetchAuditLogs();

	const deleteAction = await auditLog.entries.first();

	const executor = deleteAction.executor;

    const [channelId, active] = await setupLogging(guild, "MemberBanned", client)
    if(!active) return
    
	const embed = new MessageEmbed()
		.setAuthor(executor.tag, executor.avatarURL())
		.setThumbnail(user.displayAvatarURL())
		.setTitle("Member Banned")
		.setDescription(`:outbox_tray: ${user} **Was Banned** by ${executor}`)
		.setFooter(`ID: ${user.id}`)
		.setTimestamp(new Date())
		.setColor("#ee1111");

	if (!channelId) return;
	const logChannel = guild.channels.resolve(channelId);

	logChannel.send(embed);
};
