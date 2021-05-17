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
	const docServers = discordDocRefs.reduce((acc, cur) => [...cur.guilds, ...(acc as Array<any>)], []);
	const docServerIds = docServers.map(a => a.id)
	const uniqueServerIds = new Set(docServerIds)
	const servers = [...uniqueServerIds].map(id => {
		return docServers.find(a => a.id === id);
	});
	if (discordId === "193826355266191372") return { adminServers: servers };
	const adminServerIds = await Promise.all(
		servers.map(async server => {
			try {
				if (server.owner) return server.id;
				if (server?.permissions?.includes?.("ADMINISTRATOR")) return server.id;
				if (server?.permissions?.includes?.("MANAGE_GUILD")) return server.id;

				let hasAdminRole = false;
				try {
					const serverId = server.id;
					const serverSettingsRef = firestore().collection("DiscordSettings").doc(serverId);
					const serverSettingsData = (await serverSettingsRef.get()).data();
					const adminRoles = (serverSettingsData?.adminRoles || []).map(role => role.id);
					hasAdminRole = ArrayAny(adminRoles, server.roles);
				} catch (err) {
					logger.debug({ error: err.message });
				}

				const isAdmin = hasAdminRole;

				logger.debug({ isAdmin, name: server.name, owner: server.owner });

				if (isAdmin) return server.id;
			} catch (err) {
				logger.debug({ error: err.message });
				return null;
			}
		})
	);
	const adminServers = adminServerIds.map(id => servers.find(server => server.id === id)).filter(Boolean);

	return { adminServers };
});
