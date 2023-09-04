import { MessageEmbed } from "discord.js";
import { firestore } from "firebase-admin";

import { Logger } from "../../utils/functions/logging";
import setupLogging from "./utils/setupLogging";

export default async (oldMessage, newMessage, client) => {
	const guild = newMessage.guild;
	try {
		await oldMessage.fetch(true);
		await newMessage.fetch(true);
		if (newMessage?.author?.bot) return;
		if (oldMessage.content === newMessage.content) return;

		const [channelIds, active] = await setupLogging(guild, "messageUpdate", client);

		if (!active) return;
		if (!channelIds) return;

		const serverRef = await firestore().collection("loggingChannel").doc(guild.id).get();
		const serverData = serverRef.data();
		if (serverData) {
			const ignoredChannels = serverData.ignoredChannels?.messageUpdated || [];
			if (ignoredChannels.includes(newMessage.channel.id)) return;
		}

		const embed = new MessageEmbed()
			.setAuthor(newMessage.author.tag, newMessage.author.displayAvatarURL())
			.setDescription(
				`message edited in ${newMessage.channel} by ${newMessage.author} [Jump to message](${newMessage.url})`
			)
			.addField("Before", oldMessage.content || "unknown content")
			.addField("After", newMessage.content || "unknown content")
			.setFooter(`User ID: ${newMessage.author.id}`)
			.setTimestamp(new Date());

		for (const channelId of channelIds) {
			const logChannel = guild.channels.resolve(channelId);

			logChannel.send(embed);
		}
	} catch (err) {
		Logger.error(err.message);
	}
};
