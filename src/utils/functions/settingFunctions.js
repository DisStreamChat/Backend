import admin from "firebase-admin";


const getDiscordSettings = async ({ guild, client }) => {
	if (client?.settings?.[guild]) return client.settings[guild];
	console.log("getting settings from the database for " + guild + " the client exists: " + !!client);
	let settings = (await admin.firestore().collection("DiscordSettings").doc(guild).get()).data();
	if (!settings) {
		settings = {};
		try {
			await admin.firestore().collection("DiscordSettings").doc(guild).update({});
		} catch (err) {
			await admin.firestore().collection("DiscordSettings").doc(guild).set({});
		}
	}
	if (!client) return settings;
	client.settings = { ...(client.settings || {}), [guild]: settings };
	return settings;
};

const getLoggingSettings = async ({ guild, client }) => {
	if (client?.logging?.[guild]) return client.logging[guild];
	console.log("getting logging settings from the database for " + guild + " the client exists: " + !!client);
	let logging = (await admin.firestore().collection("loggingChannel").doc(guild).get()).data();
	if (!logging) {
		logging = {};
		try {
			await admin.firestore().collection("loggingChannel").doc(guild).update({});
		} catch (err) {
			await admin.firestore().collection("loggingChannel").doc(guild).set({});
		}
	}
	if (!client) return logging;
	client.logging = { ...(client.logging || {}), [guild]: logging };
	return logging;
};

const getLevelSettings = async (client, guild) => {
	if (client.leveling[guild]) return client.leveling[guild];

	const collectionRef = admin.firestore().collection("Leveling").doc(guild).collection("settings");

	const levelingSettingsRef = await collectionRef.get();

	const levelingSettings = levelingSettingsRef.docs.reduce((acc, cur) => ({ ...acc, [cur.id]: cur.data() }), {});
	if (client.listeners[guild]) return levelingSettings;
	console.log(`creating leveling listener for ${guild}`);
	client.listeners[guild] = collectionRef.onSnapshot(
		snapshot => {
			client.leveling[guild] = snapshot.docs.reduce((acc, cur) => ({ ...acc, [cur.id]: cur.data() }), {});
		},
		err => console.log(`snapshot error: ${err.message}`)
	);

	return levelingSettings;
};

module.exports = {
	getLevelSettings,
	getDiscordSettings,
	getLoggingSettings,
};
