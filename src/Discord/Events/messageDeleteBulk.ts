import {firestore} from "firebase-admin";
import { MessageEmbed } from "discord.js";
import setupLogging from "./utils/setupLogging";
import { logMessageDelete } from "./utils";

export default async (messages, client) => {
	const first = messages.first();
	const guild = first.guild;
	const channel = first.channel;
	const amount = messages.array().length;
	const auditLog = await guild.fetchAuditLogs();

	const deleteAction = await auditLog.entries.first();

	const executor = deleteAction.executor;

    const [channelIds, active] = await setupLogging(guild, "messageDeleteBulk", client)
    if(!active) return

	const serverRef = await firestore().collection("loggingChannel").doc(guild.id).get();
	const serverData = serverRef.data();
	if (serverData) {
        const ignoredChannels = serverData.ignoredChannels?.messageDeleteBulk || [];
        if (ignoredChannels.includes(channel.id)) return;
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

	if (!channelIds) return;

	
	const logChannel = guild.channels.resolve(channelIds);
	
	await logChannel.send(embed);
	
	for(const message of messages.array()){
		logMessageDelete(message, channelIds, executor, guild)
	}
};
