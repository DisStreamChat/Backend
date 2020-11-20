import admin from "firebase-admin";

let defaultLogging;
setTimeout(() => {
	(async () => {
		admin
			.firestore()
			.collection("defaults")
			.doc("loggingEvents")
			.onSnapshot(snapshot => {
				const data = snapshot.data();
				if (data) {
				}
				defaultLogging = data;
				console.log(defaultLogging);
			});
	})();
}, 1000);

module.exports = async (guild, id) => {
	let channelId = null;
	let active = false;
	const serverRef = await admin.firestore().collection("loggingChannel").doc(guild.id).get();
	const serverSettingsRef = await admin.firestore().collection("DiscordSettings").doc(guild.id).get()
	const serverSettingsData = serverSettingsRef.data()
	const serverData = serverRef.data();
	if (serverData) {
		if(serverSettingsData){
			active = serverSettingsData.activePlugins.logging
		}
		channelId = serverData.server;
		const channelOverrides = serverData.channelOverrides || {};
		const eventDetails = defaultLogging[id];
		const category = eventDetails?.category;
		console.log(category);
		const override = channelOverrides[category];
		if (override) channelId = override;
		const activeLogging = serverData.activeEvents || {};
		if (!activeLogging[id]) active = false;
	}
	return [channelId, active];
};
