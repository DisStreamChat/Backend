import admin from "firebase-admin";
import { MessageEmbed } from "discord.js";

module.exports = async (member, client) => {
	const guild = member.guild;

	let channelId = null;
	const serverRef = await admin.firestore().collection("loggingChannel").doc(guild.id).get();
	const serverData = serverRef.data();
	if (serverData) {
		channelId = serverData.server;
	}

	const embed = new MessageEmbed()
		.setAuthor(member.user.tag, member.user.displayAvatarURL())
		.setThumbnail(member.user.displayAvatarURL())
		.setDescription(`:outbox_tray: ${member} **left the server**`)
		.setFooter(`ID: ${member.id}`)
		.setTimestamp(new Date())
		.setColor("#ee1111");

	if (!channelId) return;
	const channel = guild.channels.resolve(channelId);

	channel.send(embed);
};
