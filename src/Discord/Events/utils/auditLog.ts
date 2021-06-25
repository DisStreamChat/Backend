import { Guild } from "discord.js";
import { firestore } from "firebase-admin";

export const writeToAuditLog = async (guild: Guild, type: string, details) => {
	firestore().collection("logging").doc(guild.id).collection("audit").add({
		type,
		details,
		time: `${new Date().toDateString()} ${new Date().toLocaleTimeString()}`
	});
};
