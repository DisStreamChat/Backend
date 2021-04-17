import { firestore } from "firebase-admin";

export const getDiscordSettings = async ({ guild, client }) => {
	if (client?.settings?.[guild]) return client.settings[guild];
	console.log("getting settings from the database for " + guild + " the client exists: " + !!client);
	let settings = (await firestore().collection("DiscordSettings").doc(guild).get()).data();
	if (!settings) {
		settings = {};
		try {
			await firestore().collection("DiscordSettings").doc(guild).update({});
		} catch (err) {
			await firestore().collection("DiscordSettings").doc(guild).set({});
		}
	}
	if (!client) return settings;
	client.settings = { ...(client.settings || {}), [guild]: settings };
	return settings;
};

export const getLoggingSettings = async ({ guild, client }) => {
	if (client?.logging?.[guild]) return client.logging[guild];
	console.log("getting logging settings from the database for " + guild + " the client exists: " + !!client);
	let logging = (await firestore().collection("logging").doc(guild).get()).data();
	if (!logging) {
		logging = {};
		try {
			await firestore().collection("logging").doc(guild).update({});
		} catch (err) {
			await firestore().collection("logging").doc(guild).set({}, { merge: true });
		}
	}
	if (!client) return logging;
	client.logging = { ...(client.logging || {}), [guild]: logging };
	return logging;
};

export const getLevelSettings = async (client, guild) => {
	if (client.leveling[guild]) return client.leveling[guild];

	const collectionRef = firestore().collection("Leveling").doc(guild).collection("settings");

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
