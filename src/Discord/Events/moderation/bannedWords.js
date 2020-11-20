import admin from "firebase-admin";
import { getDiscordSettings } from "../../../utils/functions";

module.exports = async (message, client) => {
	const settings = await getDiscordSettings({ client, guild: message.guild.id });
	const guildRef = admin.firestore().collection("moderation").doc(message.guild.id);
	const guildObj = await guildRef.get();
	const guildData = guildRef.data();
	if (!guildData) return;
};
