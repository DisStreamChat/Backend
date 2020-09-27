import admin from "firebase-admin";
import { MessageEmbed } from "discord.js";

module.exports = async emoji => {
    const guild = emoji.guild;
    if(!guild) return

	let channelId = null;
	const serverRef = await admin.firestore().collection("loggingChannel").doc(guild.id).get();
	const serverData = serverRef.data();
	if (serverData) {
		channelId = serverData.server;
    }
    
    const createdBy = await emoji.fetchAuthor()

	const embed = new MessageEmbed()
        .setAuthor(createdBy.tag, createdBy.avatarURL())
        .setThumbnail(`https://cdn.discordapp.com/emojis/${emoji.id}.${emoji.animated ? "gif" : "png"}?v=1`)
		.setDescription(`:inbox_tray: The emoji: ${emoji} **was created**`)
		.setFooter(`ID: ${emoji.id}`)
		.setTimestamp(new Date())
		.setColor("#11ee11");

	if (!channelId) return;

	const logChannel = guild.channels.resolve(channelId);

	logChannel.send(embed);
};