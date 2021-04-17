import { firestore } from "firebase-admin";
import setupLogging from "./utils/setupLogging";
import { logUpdate } from "./utils";

export default async (oldUser, newUser, DiscordClient) => {
	const serversToLog = await firestore().collection("loggingChannel").where("activeEvents.userUpdate", "==", true).get();
	const serversData = serversToLog.docs.map(doc => ({ id: doc.id, ...doc.data() }));
	const guilds = await Promise.all(
		serversData.map(async doc => await DiscordClient.guilds.fetch(doc.id)).map(promise => promise.catch(console.log))
	);
	const channelsInfo = (
		await Promise.all(
			serversData.map(async doc => ({ id: doc.id, info: await setupLogging({ id: doc.id }, "userUpdate", DiscordClient) }))
		)
	).filter(channel => {
		const guild = guilds.find(guild => guild?.id === channel?.id);
		if (guild?.member(oldUser.id)) {
			return channel.info[1];
		}
		return false;
	});

	const changeEmbed = (
		await logUpdate(newUser, oldUser, {
			title: "",
			footer: `ID: ${newUser.id}`,
			ignoredDifferences: ["flags", "LastMessageID", "LastMessageChannelID"],
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
			const channelIds = channel.info[0];
			const guild = await DiscordClient.guilds.fetch(channel.id);
			for (const channelId of channelIds) {
				const logChannel = guild.channels.resolve(channelId);

				await logChannel.send(changeEmbed);
			}
		} catch (err) {
			console.log(err.message);
		}
	}
};
