import admin from "firebase-admin";

module.exports = async (guild, id) => {
    let channelId = null;
    let active = true
	const serverRef = await admin.firestore().collection("loggingChannel").doc(guild.id).get();
	const serverData = serverRef.data();
	if (serverData) {
		channelId = serverData.server;
		const channelOverrides = serverData.channnelOverrides || {};
		const override = channelOverrides[id];
		if (override) channelId = override;
		const activeLogging = serverData.activeEvents || {};
		if (!activeLogging[id]) active = false;
    }
    return [channelId, active]
}