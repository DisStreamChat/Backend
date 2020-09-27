import admin from "firebase-admin";
import { MessageEmbed } from "discord.js";

module.exports = async messages => {
	const first = messages.first();
	const guild = first.guild;
	const channel = first.channel;
	const amount = messages.array().length;
	const auditLog = await guild.fetchAuditLogs();

	const deleteAction = await auditLog.entries.first();

	const executor = deleteAction.executor;

	let channelId = null;
	const serverRef = await admin.firestore().collection("loggingChannel").doc(guild.id).get();
	const serverData = serverRef.data();
	if (serverData) {
		channelId = serverData.server;
	}

	const embed = new MessageEmbed()
		.setAuthor(executor.tag, executor.avatarURL())
		.setTitle("Bulk Message Delete")
		.setThumbnail(executor.avatarURL())
		.setDescription(
			`:x: ${amount} messages were deleted from ${channel} by ${executor}`
		)
		.setFooter(`${amount} deleted messages`)
		.setTimestamp(new Date())
		.setColor("#ee1111");

	if (!channelId) return;

	const logChannel = guild.channels.resolve(channelId);

	logChannel.send(embed);
};
