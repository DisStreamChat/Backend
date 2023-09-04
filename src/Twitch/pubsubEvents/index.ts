import { Client } from "discord.js";
import admin from "firebase-admin";
import fs from "fs";
import { Server } from "socket.io";
import TPS from "twitchps";
import uuidv1 from "uuidv1";

import { io } from "../../app";
import { EnvManager } from "../../utils/envManager.util";
import { exists } from "../../utils/exists.util";
import { walkSync } from "../../utils/functions";
import { refreshTwitchToken } from "../../utils/functions/auth";
import { Logger } from "../../utils/functions/logging";
import { clientManager } from "../../utils/initClients";
import { formatMessage } from "../../utils/messageManipulation";
import { getInfoMessageObject } from "../TwitchEvents";

const commandPath = __dirname;
const commandFiles = [...walkSync(fs.readdirSync(commandPath), commandPath)].filter(
	file => file.name !== "index.js"
);
const commands: Record<
	string,
	{
		exec: (data: Record<string, any>, io: Server, bots: Map<string, Client>) => Promise<void>;
		[key: string]: any;
	}
> = commandFiles.reduce(
	(acc, cur) => ({
		...acc,
		[cur.name.replace(".js", "")]: { ...cur, exec: require(cur.path).default },
	}),
	{}
);

const pubsubbedChannels: { listener: TPS; id: string; isUser?: boolean }[] = [];
let isPubsubSetup = false;

export async function setupTwitchPubsub() {
	if (EnvManager.BOT_DEV || pubsubbedChannels.length > 1 || isPubsubSetup) return;

	admin
		.firestore()
		.collection("live-notify")
		.onSnapshot(snapshot => liveNotifyHandler(snapshot).catch());

	admin
		.firestore()
		.collection("Streamers")
		.onSnapshot(allStreamersRef => streamersHandler(allStreamersRef).catch());

	isPubsubSetup = false;
}

async function streamersHandler(
	allStreamersRef: FirebaseFirestore.QuerySnapshot<FirebaseFirestore.DocumentData>
) {
	const trulyAdded = allStreamersRef
		.docChanges()
		.filter(change => change.type !== "modified")
		.map(change => change.doc);

	if (!trulyAdded.length) return;

	const allStreamersTwitchData = (
		await Promise.all(
			trulyAdded.map(async doc => await doc.ref.collection("twitch").doc("data").get())
		)
	).map(doc => (doc as any).data());

	const authorizedStreamers = allStreamersTwitchData
		.filter(exists)
		.filter(
			streamer =>
				!pubsubbedChannels.find(
					subChannel => subChannel.id === streamer.user_id && subChannel.isUser
				)
		);

	Logger.log(`Authorized Streamers: ${authorizedStreamers.length}`);

	authorizedStreamers.forEach(async streamer => {
		if (!streamer.user_id) return;

		const streamerData = await clientManager.twitchApiClient.getUserInfo(streamer.user_id);

		const { access_token, scope } = await refreshTwitchToken(streamer.refresh_token);

		if (!scope?.includes?.("channel:moderate")) return;

		const init_topics = [
			{
				topic: `channel-points-channel-v1.${streamer.user_id}`,
				token: access_token,
			},
			{
				topic: `chat_moderator_actions.${streamer.user_id}`,
				token: access_token,
			},
		];

		const pubSub = new TPS({
			init_topics,
			reconnect: false,
			debug: false,
		});

		pubSub.channelName = streamerData.login;

		pubsubbedChannels.push({
			listener: pubSub,
			id: streamer.user_id,
			isUser: true,
		});

		pubSub.on("channel-points", async (data: Record<string, any>) => {
			try {
				const { redemption, channel_id } = data;
				const user = await clientManager.twitchApiClient.getUserInfo(channel_id);
				const channelName = user.login;

				let messageBody = `${
					redemption.user.display_name || redemption.user.login
				} has redeemed: ${redemption.reward.title} `;

				if (redemption.reward.prompt.length > 0) {
					messageBody = `${messageBody} - ${redemption.reward.prompt}`;
				}
				const id = uuidv1();

				const messageObject = getInfoMessageObject({
					body: messageBody,
					type: "channel-points",
					id,
				});

				io.in(`twitch-${channelName}`).emit("chatmessage", messageObject);
			} catch (error) {
				console.log("error sending redemption message", data, error.message);
			}
		});

		pubSub.on("automod_rejected", async (data: Record<string, string>) => {
			try {
				const { channelName } = pubSub;
				const messageBody = await formatMessage(
					data.message,
					"twitch",
					{},
					{ HTMLClean: true }
				);
				const id = uuidv1();
				const messageObject = getInfoMessageObject({
					displayName: "AutoMod",
					body: messageBody,
					type: "auto-mod-reject",
					id,
					userColor: "#ff0029",
					...data,
				});
				io.in(`twitch-${channelName}`).emit("auto-mod", messageObject);
			} catch (error) {
				Logger.error(error.message);
			}
		});

		pubSub.on("approved_automod_message", (data: Record<string, string>) => {
			const { channelName } = pubSub;
			io.in(`twitch-${channelName}`).emit("remove-auto-mod", data);
		});

		pubSub.on("denied_automod_message", (data: Record<string, string>) => {
			const { channelName } = pubSub;
			io.in(`twitch-${channelName}`).emit("remove-auto-mod", data);
		});

		pubSub.on("add_blocked_term", (data: Record<string, string>) => {
			console.log("Mod", data.created_by);
			console.log("ModID", data.created_by_user_id);
			console.log("Added Blocked Term", data.approved_term);
		});

		pubSub.on("delete_blocked_term", (data: Record<string, string>) => {
			console.log("Mod", data.created_by);
			console.log("ModID", data.created_by_user_id);
			console.log("Deleted Blocked Term", data.blocked_term);
		});

		pubSub.on("add_permitted_term", (data: Record<string, string>) => {
			console.log("Mod", data.created_by);
			console.log("ModID", data.created_by_user_id);
			console.log("Added Permitted Term", data.approved_term);
		});

		pubSub.on("delete_permitted_term", (data: Record<string, string>) => {
			console.log("Mod", data.created_by);
			console.log("ModID", data.created_by_user_id);
			console.log("Deleted Permitted Term", data.blocked_term);
		});
	});
}

async function liveNotifyHandler(
	snapshot: FirebaseFirestore.QuerySnapshot<FirebaseFirestore.DocumentData>
) {
	const allNotifyingChannels = [
		...new Set(
			snapshot.docs
				.map(doc => doc.data().channels as string[])
				.reduce((acc, cur) => [...acc, ...cur])
		),
	].filter(channel => !pubsubbedChannels.find(subChannel => subChannel.id === channel));

	for (const channel of allNotifyingChannels) {
		const streamerData = await clientManager.twitchApiClient.getUserInfo(channel as string);

		const init_topics = [
			{
				topic: `video-playback.${streamerData.login}`,
			},
		];

		const pubSub = new TPS({
			init_topics,
			reconnect: false,
			debug: false,
		});

		pubSub.channelName = streamerData.login;

		pubsubbedChannels.push({ listener: pubSub, id: channel });

		pubSub.on("stream-up", (data: Record<string, string>) =>
			commands["stream-up"].exec(
				{ ...data, id: channel, ...streamerData },
				io,
				clientManager.customBots
			)
		);
	}
}
