import admin from "firebase-admin";
import { MessageEmbed } from "discord.js";

module.exports = async (guild, user) => {
	const auditLog = await guild.fetchAuditLogs();

	const deleteAction = await auditLog.entries.first();

	const executor = deleteAction.executor;

	let channelId = null;
	const serverRef = await admin.firestore().collection("loggingChannel").doc(guild.id).get();
	const serverData = serverRef.data();
	if (serverData) {
		channelId = serverData.server;
		const activeLogging = serverData.activeEvents || {};
		if (!activeLogging["MemberUnBanned"]) return;
	}

	const embed = new MessageEmbed()
		.setAuthor(executor.tag, executor.avatarURL())
		.setThumbnail(user.displayAvatarURL())
		.setTitle("Member unBanned")
		.setDescription(`:inbox_tray: ${user} **Was Unbanned** by ${executor}`)
		.setFooter(`ID: ${user.id}`)
		.setTimestamp(new Date())
		.setColor("#11ee11");

	if (!channelId) return;
	const logChannel = guild.channels.resolve(channelId);

	logChannel.send(embed);
};
