import admin from "firebase-admin";
import { MessageEmbed } from "discord.js";
import setupLogging from "./utils/setupLogging";

export default async (oldMessage, newMessage, client) => {
	const guild = newMessage.guild;
	try {
		await oldMessage.fetch(true);
		await newMessage.fetch(true);
		if(newMessage?.author?.bot) return
		if(oldMessage.content === newMessage.content) return

		const [channelId, active] = await setupLogging(guild, "messageUpdate", client);

		if (!active) return;
		if (!channelId) return;

		const serverRef = await admin.firestore().collection("loggingChannel").doc(guild.id).get();
		const serverData = serverRef.data();
		if (serverData) {
			const ignoredChannels = serverData.ignoredChannels?.messageUpdated || [];
			if (ignoredChannels.includes(newMessage.channel.id)) return;
		}

		const embed = new MessageEmbed()
			.setAuthor(newMessage.author.tag, newMessage.author.displayAvatarURL())
			.setDescription(`message edited in ${newMessage.channel} by ${newMessage.author} [Jump to message](${newMessage.url})`)
			.addField("Before", oldMessage.content || "unknown content")
			.addField("After", newMessage.content || "unknown content")
			.setFooter(`User ID: ${newMessage.author.id}`)
			.setTimestamp(new Date());

		const logChannel = guild.channels.resolve(channelId);

		logChannel.send(embed);
	} catch (err) {
		console.log(err.message);
	}
};
