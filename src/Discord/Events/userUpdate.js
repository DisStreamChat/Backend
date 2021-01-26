import admin from "firebase-admin";
import setupLogging from "./utils/setupLogging";
import { logUpdate } from "./utils";

module.exports = async (oldUser, newUser, DiscordClient) => {
	const serversToLog = await admin.firestore().collection("loggingChannel").where("activeEvents.userUpdate", "==", true).get();
	console.log(serversToLog.docs.length);
	const serversData = serversToLog.docs.map(doc => ({ id: doc.id, ...doc.data() }));
	const channelsInfo = (
		await Promise.all(
			serversData.map(async doc => ({ id: doc.id, info: await setupLogging({ id: doc.id }, "userUpdate", DiscordClient) }))
		)
	).filter(channel => channel.info[1]);

	console.log(channelsInfo);

	const changeEmbed = (
		await logUpdate(newUser, oldUser, {
			title: "",
			footer: `ID: ${newUser.id}`,
			ignoredDifferences: ["flags"],
			valueMap: {
				avatar: (value, isNew) => (isNew ? `[new](${newUser.displayAvatarURL()})` : `[old](${oldUser.displayAvatarURL()})`),
			},
		})
	)
		.setColor("#faa51b")
		.setDescription(`${newUser} **has updated their profile**`)
		.setAuthor(newUser.tag, oldUser.displayAvatarURL())
		.setThumbnail(newUser.displayAvatarURL());
	for (const channel of channelsInfo) {
		try {
			const channelId = channel.info[0]?.split("=")?.[0];
			const guild = await DiscordClient.guilds.fetch(channel.id);
			const logChannel = guild.channels.resolve(channelId);

			await logChannel.send(changeEmbed);
		} catch (err) {
			console.log(err.message);
		}
	}
};
