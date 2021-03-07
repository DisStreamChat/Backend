import * as functions from "firebase-functions";
import * as admin from "firebase-admin";

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
