import admin from "firebase-admin";
import { MessageEmbed } from "discord.js";
const rdiff = require("recursive-diff");

module.exports = async (oldRole, newRole) => {
    console.log("role updated")
	const guild = oldRole.guild;

	const auditLog = await guild.fetchAuditLogs();

	const deleteAction = await auditLog.entries.first();

	let executor = deleteAction.executor;

	let channelId = null;
	const serverRef = await admin.firestore().collection("loggingChannel").doc(guild.id).get();
	const serverData = serverRef.data();
	if (serverData) {
		channelId = serverData.server;
		const activeLogging = serverData.activeEvents || {};
		if (!activeLogging["roleUpdate"]) return;
	}

	if (!channelId) return;
	// let changed = "";
	// if (oldRold.name !== newRole.name) {
	// 	changed = "name";
	// } else if (oldRole.color !== newRole.color) {
	// 	changed = "color";
	// } else if(oldRole.hoist !== newRole.hoist){

	// }

	// console.log(oldRole, newRole)
};
