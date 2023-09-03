import { firestore } from "firebase-admin";

import { Duration, setDurationTimeout } from "../../../utils/duration.util";
import { getDiscordSettings, getLoggingSettings } from "../../../utils/functions";

let defaultLogging;
setDurationTimeout(() => {
	(async () => {
		firestore()
			.collection("defaults")
			.doc("loggingEvents")
			.onSnapshot(snapshot => {
				const data = (defaultLogging = snapshot.data());
			});
	})();
}, Duration.fromSeconds(1));

export default async (guild, id, client): Promise<[any[], boolean]> => {
	let channelIds = [];
	let active = false;
	const serverSettingsData = await getDiscordSettings({ guild: guild.id, client });
	const serverData = await getLoggingSettings({ guild: guild.id, client });
	if (serverData) {
		channelIds = Object.values(serverData)
			.filter((action: any) => action.action?.id?.toLowerCase() === id?.toLowerCase())
			.map((action: any) => action.channel.id);

		if (serverSettingsData) {
			active = serverSettingsData.activePlugins.logging;
		}
	}
	return [channelIds, active];
};
