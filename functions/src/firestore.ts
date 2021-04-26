import * as functions from "firebase-functions";
import * as admin from "firebase-admin";
import fetch from "node-fetch";

const ArrayAny = (arr1, arr2) => arr1.some(v => arr2.indexOf(v) >= 0);

const log = (...args) => functions.logger.debug(...args);
// admin.initializeApp();

export const aggregateServers = functions.firestore.document("Streamers/{docId}/discord/data").onWrite(async (change, context) => {
	const id = context.params.docId;
	functions.logger.debug(`change made to ${id}`);

	const docRef = admin.firestore().collection("Streamers").doc(id);
	const discordRef = docRef.collection("discord").doc("data");
	const discordData = (await discordRef.get()).data();

	const servers = discordData.guilds;

	const adminServers = [];
	for (const server of servers) {
		try {
			const serverId = server.id;
			const serverSettingsRef = admin.firestore().collection("DiscordSettings").doc(serverId);
			const serverSettingsData = (await serverSettingsRef.get()).data();
			if (!serverSettingsData) continue;
			const adminRoles = (serverSettingsData.adminRoles || []).map(role => role.id);

			if (
				ArrayAny(adminRoles, server.roles) ||
				server.permissions.includes("MANAGE_GUILD") ||
				server.owner ||
				server.permissions.includes("ADMINISTRATOR")
			) {
				adminServers.push(server);
			}
		} catch (err) {}
	}
	return await docRef.update({ adminServers });
});

export const aggregateRankCards = functions.firestore.document("Leveling/{serverId}/users/{userId}").onWrite(async (change, context) => {
	const { serverId, userId } = context.params;
	log(context.params, change);
	log(serverId, userId);
	const apiUrl = `https://api.disstreamchat.com/v2/discord/rankcard?guild=${serverId}&user=${userId}`;
	log(apiUrl);

	const fileName = `${userId}.png`;
	const response = await fetch(apiUrl);

	log(response.headers);
	const buffer = await response.buffer();
	// const blob = await response.blob()

	const bucket = admin.storage().bucket();

	const imageBucket = "rankcard/";

	const destination = `${imageBucket}${serverId}/${fileName}`;

	const file = bucket.file(destination);

	log(buffer.byteLength);
	await file.save(buffer, { contentType: "image/png" });
	return true;
});

export const aggregateDiscordId = functions.firestore.document("Streamers/{userId}/discord/data").onWrite(async (change, context) => {
	const { userId } = context.params;
	const data = change.after.data();
	const docRef = admin.firestore().collection("Streamers").doc(userId);
	return await docRef.set({ discordId: data.id }, { merge: true });
});
