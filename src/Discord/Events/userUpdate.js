import admin from "firebase-admin";
import { MessageEmbed } from "discord.js";
import setupLogging from "./utils/setupLogging";
import {DiscordClient} from "../../utils/initClients"

module.exports = async (oldMember, newMember) => {
	const serversToLog = await admin.firestore().collection("loggingChannel").where("activeEvents.userUpdate", "==", true).get();
	console.log(serversToLog.docs.length);
	const serversData = serversToLog.docs.map(doc => ({ id: doc.id, ...doc.data() }));
	const channelsInfo = (await Promise.all(
		serversData.map(async doc => ({ id: doc.id, info: await setupLogging({ id: doc.id }, "userUpdate") }))
	)).filter(channel => channel.info[1]);

	const changeEmbed = new MessageEmbed().setTitle("User updated");
	for (const channel of channelsInfo) {
        const channelId = channel.info[0];
        const guild = DiscordClient.guilds.resolve(channel.id)
		const logChannel = guild.channels.resolve(channelId);

		await logChannel.send(changeEmbed);
	}
};
