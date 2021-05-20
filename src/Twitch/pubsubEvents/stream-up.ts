import { MessageEmbed } from "discord.js";
import { TwitchApiClient as Api, discordClient } from "../../utils/initClients";
import { firestore } from "firebase-admin";
import { log } from "../../utils/functions/logging";
interface StreamModel {
	user_name: string;
	title: string;
	game_name: string;
	viewer_count: string | number;
	thumbnail_url: string;
}

const getStream = (channel_name): Promise<StreamModel> => {
	return new Promise((res, rej) => {
		setTimeout(() => {
			rej("Stream Took Too long");
		}, 30000 * 5);
		const intervalId = setInterval(async () => {
			log("fetching stream");
			const apiUrl = `https://api.twitch.tv/helix/streams?user_login=${channel_name}`;
			const streamDataResponse = await Api.fetch(apiUrl);
			const streamData = streamDataResponse.data;
			const stream = streamData[0];
			if (stream) {
				clearInterval(intervalId);
				res(stream);
			}
		}, 30000);
	});
};

const handleAppNotifications = async (data, io) => {
	const stream = await getStream(data.channel_name);
	io.in(`twitch-dscnotifications`).emit("stream-up", { stream, ...data });
};

const handleDiscordNotifications = async (data, channel, bots) => {
	const serversToNotifyRef = firestore().collection("DiscordSettings").where("live-notification", "array-contains", data.id);
	const serversToNofiy = await serversToNotifyRef.get();
	const serversToNofiyData = serversToNofiy.docs.map(doc => ({ docId: doc.id, ...doc.data() }));

	const stream: StreamModel = await getStream(data.channel_name);

	const embed = new MessageEmbed()
		.setAuthor(stream.user_name, data.profile_image_url)
		.setDescription(`[**${stream.title}**](https://www.twitch.tv/${stream.user_name.toLowerCase()})`)
		.setThumbnail(data.profile_image_url)
		.addField("Game", stream.game_name, true)
		.addField("Viewers", stream.viewer_count, true)
		.setImage(stream.thumbnail_url.replace("{width}x{height}", "320x180"))
		.setColor("#772ce8");

	for (const server of serversToNofiyData) {
		try {
			const notifyBot = bots.get(server.docId) || discordClient;

			const notifyChannelId = server["notification-channels"][data.id];

			const guild = await notifyBot.guilds.fetch(server.docId);

			const notifyChannel = guild.channels.resolve(notifyChannelId);

			notifyChannel.send(embed);
		} catch (err) {
			log(err.message, { error: true });
		}
	}
};

export default async (data, channel, io, bots) => {
	handleAppNotifications(data, io);
	handleDiscordNotifications(data, channel, bots);
};
