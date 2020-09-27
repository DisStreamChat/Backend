import admin from "firebase-admin";
import { MessageEmbed } from "discord.js";

module.exports = async message => {
	const guild = message.guild;

	const auditLog = await guild.fetchAuditLogs();

	const deleteAction = await auditLog.entries.first();

	const executor = deleteAction.executor;

	const { channel, content, author, id } = message;

	let channelId = null;
	const serverRef = await admin.firestore().collection("loggingChannel").doc(guild.id).get();
	const serverData = serverRef.data();
	if (serverData) {
		channelId = serverData.server;
		const ignoredChannels = serverData.ignoredChannels?.messageDeleted || [];
		if (ignoredChannels.includes(message.channel.id)) return;
	}

	const embed = new MessageEmbed()
		.setAuthor(executor.tag, executor.avatarURL())
		.setTitle("Message Deleted")
		.setThumbnail(executor.avatarURL())
		.setDescription(
			`:x: A message from ${author || "An unknown user"} was deleted from ${channel} by ${executor}`
        )
        .addField("Message Content", content || "unkown content")
		.setFooter(`ID: ${id}`)
		.setTimestamp(new Date())
		.setColor("#ee1111");

	if (!channelId) return;

	const logChannel = guild.channels.resolve(channelId);

	logChannel.send(embed);
};
