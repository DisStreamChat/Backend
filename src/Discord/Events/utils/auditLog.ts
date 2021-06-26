import { Guild } from "discord.js";
import { firestore } from "firebase-admin";

export const writeToAuditLog = async (guild: Guild, type: string, details) => {
	console.log(guild.id);
	await firestore()
		.collection("logging")
		.doc(guild.id)
		.collection("audit")
		.add(
			JSON.parse(
				JSON.stringify({
					type,
					details,
					time: `${new Date().toDateString()} ${new Date().toLocaleTimeString()}`,
					createdAt: new Date().getTime(),
				})
			)
		);
};
