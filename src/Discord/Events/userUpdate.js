import admin from "firebase-admin";
import { MessageEmbed } from "discord.js";
import setupLogging from "./utils/setupLogging";
// import { DiscordClient } from "../../utils/initClients";

module.exports = async (oldMember, newMember, DiscordClient) => {
	const serversToLog = await admin.firestore().collection("loggingChannel").where("activeEvents.userUpdate", "==", true).get();
	console.log(serversToLog.docs.length);
	const serversData = serversToLog.docs.map(doc => ({ id: doc.id, ...doc.data() }));
	const channelsInfo = (
		await Promise.all(
			serversData.map(async doc => ({ id: doc.id, info: await setupLogging({ id: doc.id }, "userUpdate", DiscordClient) }))
		)
	).filter(channel => channel.info[1]);

	const changeEmbed = new MessageEmbed()
		.setColor("#faa51b")
		.setTitle(`${newMember} has updated There profile`)
		.setFooter(`ID: ${newMember.id}`);
	for (const channel of channelsInfo) {
		const channelId = channel.info[0];
		const guild = DiscordClient.guilds.resolve(channel.id);
		const logChannel = guild.channels.resolve(channelId);

		await logChannel.send(changeEmbed);
	}
};
