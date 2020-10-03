import admin from "firebase-admin";
import { MessageEmbed } from "discord.js";

module.exports = async invite => {
    const guild = invite.guild;
    if(!guild) return

	let channelId = null;
	const serverRef = await admin.firestore().collection("loggingChannel").doc(guild.id).get();
	const serverData = serverRef.data();
	if (serverData) {
        channelId = serverData.server;
        const activeLogging = serverData.activeEvents || {}
        if(!activeLogging["InviteCreate"]) return 
	}

	const embed = new MessageEmbed()
		.setAuthor("DisStreamBot")
		.setDescription(`:inbox_tray: The invite: ${invite.url} **was created**`)
		.setFooter(`Code: ${invite.code}`)
		.setTimestamp(new Date())
		.setColor("#11ee11");

	if (!channelId) return;

	const logChannel = guild.channels.resolve(channelId);

	logChannel.send(embed);
};