import { firestore } from "firebase-admin";
import { getDiscordSettings, getLoggingSettings } from "../../../utils/functions";

let defaultLogging;
setTimeout(() => {
	(async () => {
		firestore()
			.collection("defaults")
			.doc("loggingEvents")
			.onSnapshot(snapshot => {
				const data = snapshot.data();
				if (data) {
				}
				defaultLogging = data;
			});
	})();
}, 1000);

export default async (guild, id, client) => {
	let channelId = null;
	let active = false;
	const serverSettingsData = await getDiscordSettings({ guild: guild.id, client });
	const serverData = await getLoggingSettings({ guild: guild.id, client });
	if (serverData) {
		if (serverSettingsData) {
			active = serverSettingsData.activePlugins.logging;
		}
		channelId = serverData.server;
		const channelOverrides = serverData.channelOverrides || {};
		const eventDetails = defaultLogging[id];
		const category = eventDetails?.category;
		const override = channelOverrides[category];
		if (override) channelId = override;
		const activeLogging = serverData.activeEvents || {};
		if (!activeLogging[id]) active = false;
	}
	return [channelId, active];
};
