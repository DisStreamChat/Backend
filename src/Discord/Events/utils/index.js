
import { MessageEmbed } from "discord.js"


export const logMessageDelete = (message, channelId, executor, guild) => {
	const { channel, content, author, id } = message;
	
	const embed = new MessageEmbed()
		.setAuthor(executor?.tag || "Unknown Deleter", executor?.avatarURL?.())
		.setTitle("Message Deleted")
		.setThumbnail(executor?.avatarURL())
        .addField("Message Sender", `${author || "An unknown user"}`, true)
        .addField("Channel", `${channel}`, true)
        .addField("Deleted By", `${executor || "Unknown"}`, true)
        .addField("Message Content", content || "Unknown content")
		.setFooter(`ID: ${id}`)
		.setTimestamp(new Date())
		.setColor("#ee1111");

	if (!channelId) return;

	const logChannel = guild.channels.resolve(channelId);

	logChannel.send(embed);

}