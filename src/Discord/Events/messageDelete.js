import admin from "firebase-admin";
import { MessageEmbed } from "discord.js";
import setupLogging from "./utils/setupLogging";
import {DiscordClient} from "../../utils/initClients"
module.exports = async message => {
	const guild = message.guild;

	const auditLog = await guild.fetchAuditLogs();

	const deleteAction = await auditLog.entries.first();

	let executor = deleteAction.executor;

	if(DiscordClient.deleter){
		console.log("bot deleter")
		executor = DiscordClient.user
	}

	const { channel, content, author, id } = message;

    const [channelId, active] = await setupLogging(guild, "messageDelete")
    if(!active) return

	const serverRef = await admin.firestore().collection("loggingChannel").doc(guild.id).get();
	const serverData = serverRef.data();
	if (serverData) {
        const ignoredChannels = serverData.ignoredChannels?.messageDeleted || [];
        if (ignoredChannels.includes(message.channel.id)) return;
	}

	const embed = new MessageEmbed()
		.setAuthor(executor.tag, executor.avatarURL())
		.setTitle("Message Deleted")
		.setThumbnail(executor.avatarURL())
		// .setDescription(
		// 	`:x: A message from ${author || "An unknown user"} was deleted from ${channel} by ${executor}`
        // )
        .addField("Message Sender", `${author || "An unknown user"}`, true)
        .addField("Channel", `${channel}`, true)
        .addField("Deleted By", `${executor}`, true)
        .addField("Message Content", content || "unkown content")
		.setFooter(`ID: ${id}`)
		.setTimestamp(new Date())
		.setColor("#ee1111");

	if (!channelId) return;

	const logChannel = guild.channels.resolve(channelId);

	logChannel.send(embed);
};
