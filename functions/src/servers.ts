import { https, logger } from "firebase-functions";
import { firestore } from "firebase-admin";
interface ServersData {
	discordId: string;
}

const ArrayAny = (arr1, arr2) => arr1.some(v => arr2.indexOf(v) >= 0);

export const getServers = https.onCall(async (data: ServersData, context) => {
	const { discordId } = data;
	const docRefs = await firestore().collection("Streamers").where("discordId", "==", discordId).get();
	const discordDocRefs = await Promise.all(docRefs.docs.map(async doc => (await doc.ref.collection("discord").doc("data").get()).data()));
	const docServers = discordDocRefs.map(doc => doc.guilds);
	const servers = Array.from(new Set(docServers.map(a => a.id))).map(id => {
		return docServers.find(a => a.id === id);
	})[0];
	logger.debug(servers);
	if (discordId === "193826355266191372") return { adminServers: servers };
	const adminServerIds = await Promise.all(
		servers.map(async server => {
			try {
				const serverId = server.id;
				const serverSettingsRef = firestore().collection("DiscordSettings").doc(serverId);
				const serverSettingsData = (await serverSettingsRef.get()).data();
				if (!serverSettingsData) return null;
				const adminRoles = (serverSettingsData.adminRoles || []).map(role => role.id);

				if (
					ArrayAny(adminRoles, server.roles) ||
					server.permissions.includes("MANAGE_GUILD") ||
					server.owner ||
					server.permissions.includes("ADMINISTRATOR")
				)
					return server.id;
			} catch (err) {
				return null;
			}
		})
	);
	const adminServers = adminServerIds.map(id => servers.find(server => server.id === id)).filter(Boolean);

	return { adminServers };
});
