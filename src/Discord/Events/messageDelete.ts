import setupLogging from "./utils/setupLogging";
import { logMessageDelete } from "./utils";
import { firestore } from "firebase-admin";
import { sleep } from "../../utils/functions";
import { Message } from "discord.js";
import { DiscordClient } from "../../clients/discord.client";

export default async (message: Message, client: DiscordClient) => {
	await sleep(2000);
	try {
		message = await message.fetch(true);
	} catch (err) {
		
	}
	const guild = message.guild;

	// get the deleter from the guilds audit log
	const auditLog = await guild.fetchAuditLogs();

	const deleteAction = auditLog.entries.first();

	let executor = deleteAction.executor;

	if (deleteAction.action !== "MESSAGE_DELETE") {
		executor = message.author;
	}

	const [channelIds, active] = await setupLogging(guild, "messageDelete", client);

	const serverRef = await firestore().collection("loggingChannel").doc(guild.id).get();
	const serverData = serverRef.data();
	if (serverData) {
		const ignoredChannels = serverData.ignoredChannels?.messageDeleted || [];
		if (ignoredChannels.includes(message.channel.id)) return;
	}

	if (!active) return;

	logMessageDelete(message, channelIds, executor, guild);
};
