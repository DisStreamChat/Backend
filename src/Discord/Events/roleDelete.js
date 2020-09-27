import admin from "firebase-admin";
import { MessageEmbed } from "discord.js";

module.exports = async role => {
    const guild = role.guild;
    if(!guild) return

	let channelId = null;
	const serverRef = await admin.firestore().collection("loggingChannel").doc(guild.id).get();
	const serverData = serverRef.data();
	if (serverData) {
        channelId = serverData.server;
        const activeLogging = serverData.activeEvents || {}
        if(!activeLogging["roleDelete"]) return 
    }
    
	const embed = new MessageEmbed()
		.setDescription(`:inbox_tray: The role: ${role.name} **was deleted**`)
		.setFooter(`ID: ${role.id}`)
		.setTimestamp(new Date())
		.setColor("#ee1111");

	if (!channelId) return;

	const logChannel = guild.channels.resolve(channelId);

	logChannel.send(embed);
};