import { firestore } from "firebase-admin";
import { DiscordClient } from "../../../clients/discord.client";
import { getDiscordSettings, getLoggingSettings } from "../../../utils/functions";

let defaultLogging;
setTimeout(() => {
	(async () => {
		firestore()
			.collection("defaults")
			.doc("loggingEvents")
			.onSnapshot(snapshot => {
				const data = snapshot.data();

				defaultLogging = data;
			});
	})();
}, 1000);

export default async (guild: { id: string }, id: string, client: DiscordClient): Promise<[string[], boolean]> => {
	let channelIds = [];
	let active = false;
	const serverSettingsData = await getDiscordSettings({ guild: guild.id, client });
	const serverData = await getLoggingSettings({ guild: guild.id, client });
	if (serverData) {
		channelIds = Object.values(serverData)
			.filter((log: any) => log.action?.id?.toLowerCase() === id?.toLowerCase())
			.map((log: any) => log.channel.id);

		if (serverSettingsData) {
			active = serverSettingsData.activePlugins.logging;
		}
	}
	return [channelIds, active];
};
