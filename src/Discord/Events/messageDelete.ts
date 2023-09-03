import { firestore } from "firebase-admin";

import { Duration, sleep } from "../../utils/duration.util";
import { logMessageDelete } from "./utils";
import setupLogging from "./utils/setupLogging";

export default async (message, DiscordClient) => {
	await sleep(Duration.fromSeconds(0.5));
	const guild = message.guild;

	// get the deleter from the guilds audit log
	const auditLog = await guild.fetchAuditLogs();

	const deleteAction = await auditLog.entries.first();

	let executor = deleteAction.executor;

	if (deleteAction.action !== "MESSAGE_DELETE") {
		executor = message.author;
	}

	const [channelIds, active] = await setupLogging(guild, "messageDelete", DiscordClient);

	const serverRef = await firestore().collection("loggingChannel").doc(guild.id).get();
	const serverData = serverRef.data();
	if (serverData) {
		const ignoredChannels = serverData.ignoredChannels?.messageDeleted || [];
		if (ignoredChannels.includes(message.channel.id)) return;
	}

	if (!active) return;

	logMessageDelete(message, channelIds, executor, guild);
};
