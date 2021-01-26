import admin from "firebase-admin";
import { MessageEmbed } from "discord.js";
const deepEqual = require("deep-equal");


module.exports = async (oldMember, newMember, client) => {
	const guild = newMember.guild;

	let channelId = null;
	const serverRef = await admin.firestore().collection("loggingChannel").doc(guild.id).get();
	const serverData = serverRef.data();
	if (serverData) {
		channelId = serverData.server;
		const activeLogging = serverData.activeEvents || {};
		// if (!activeLogging["member update"]) return;
	}

	if (!channelId) return;

	const changes = [];
	if (oldMember.nickname !== newMember.nickname) {
		changes.push("nickname");
	}
	if (
		!deepEqual(
			oldMember.roles.cache.array().map(role => role.id),
			newMember.roles.cache.array().map(role => role.id)
		)
	) {
		changes.push("roles");
    }

	console.log(changes);
};
