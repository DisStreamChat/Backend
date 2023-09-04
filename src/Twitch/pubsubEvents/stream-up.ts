import { MessageEmbed } from "discord.js";
import { firestore } from "firebase-admin";

import { Duration, setDurationInterval, setDurationTimeout } from "../../utils/duration.util";
import { Logger } from "../../utils/functions/logging";
import { clientManager } from "../../utils/initClients";

interface StreamModel {
	user_name: string;
	title: string;
	game_name: string;
	viewer_count: string | number;
	thumbnail_url: string;
}

const getStream = (channel_name): Promise<StreamModel> => {
	return new Promise((res, rej) => {
		setDurationTimeout(() => {
			rej("Stream Took Too long");
		}, Duration.fromMinutes(3));
		const intervalId = setDurationInterval(async () => {
			Logger.log("fetching stream");
			const apiUrl = `https://api.twitch.tv/helix/streams?user_login=${channel_name}`;
			const streamDataResponse = await clientManager.twitchApiClient.fetch(apiUrl);
			const streamData = streamDataResponse.data;
			const stream = streamData[0];
			if (stream) {
				clearInterval(intervalId);
				res(stream);
			}
		}, Duration.fromSeconds(30));
	});
};

const handleAppNotifications = async (data, io) => {
	const stream = await getStream(data.channel_name);
	io.in(`twitch-dscnotifications`).emit("stream-up", { stream, ...data });
};

const handleDiscordNotifications = async (data, bots) => {
	const serversToNotifyRef = firestore()
		.collection("DiscordSettings")
		.where("live-notification", "array-contains", data.id);
	const serversToNofiy = await serversToNotifyRef.get();
	const serversToNofiyData = serversToNofiy.docs.map(doc => ({ docId: doc.id, ...doc.data() }));

	const stream: StreamModel = await getStream(data.channel_name);

	const embed = new MessageEmbed()
		.setAuthor(stream.user_name, data.profile_image_url)
		.setDescription(
			`[**${stream.title}**](https://www.twitch.tv/${stream.user_name.toLowerCase()})`
		)
		.setThumbnail(data.profile_image_url)
		.addField("Game", stream.game_name, true)
		.addField("Viewers", stream.viewer_count, true)
		.setImage(stream.thumbnail_url.replace("{width}x{height}", "320x180"))
		.setColor("#772ce8");

	for (const server of serversToNofiyData) {
		try {
			const notifyBot = bots.get(server.docId) || clientManager.discordClient;
			const notifyChannelId = server["notification-channels"][data.id];
			const guild = await notifyBot.guilds.fetch(server.docId);
			const notifyChannel = guild.channels.resolve(notifyChannelId);

			notifyChannel.send(embed);
		} catch (err) {
			Logger.error(err.message);
		}
	}
};

export default async (data, io, bots) => {
	handleAppNotifications(data, io);
	handleDiscordNotifications(data, bots);
};
