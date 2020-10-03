import admin from "firebase-admin";
const { formatFromNow } = require("../../utils/functions");
import { MessageEmbed } from "discord.js";

module.exports = async (member, client) => {
	const guild = member.guild;

	let channelId = null;
	const serverRef = await admin.firestore().collection("loggingChannel").doc(guild.id).get();
	const serverData = serverRef.data();
	if (serverData) {
        channelId = serverData.server;
        const activeLogging = serverData.activeEvents || {}
        if(!activeLogging["MemberAdd"]) return 
	}

	const embed = new MessageEmbed()
		.setAuthor(member.user.tag, member.user.displayAvatarURL())
		.setThumbnail(member.user.displayAvatarURL())
        .setDescription(`:inbox_tray: ${member} **joined the server**`)
        .addField("Account Created", formatFromNow(member.user.createdAt))
		.setFooter(`ID: ${member.id}`)
		.setTimestamp(new Date())
		.setColor("#11ee11");

	if (!channelId) return;
	const logChannel = guild.channels.resolve(channelId);

	logChannel.send(embed);
};
