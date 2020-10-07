import admin from "firebase-admin";
import { MessageEmbed } from "discord.js";
// const rdiff = require("recursive-diff");

module.exports = async (oldRole, newRole) => {
	await new Promise(res => setTimeout(res, 300))
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
	let changed = [];
	if (oldRole.name !== newRole.name) {
		changed.push("name");
	}
	if (oldRole.color !== newRole.color) {
		changed.push("color");
	}
	if (oldRole.hoist !== newRole.hoist) {
		changed.push("hoist");
	}
	if (oldRole.mentionable !== newRole.mentionable) {
		changed.push("mentionable");
	}
	if(!oldRole.permissions.equals(newRole.permissions.bitfield)){
		changed.push("permissions")
	}
	if(oldRole.rawPosition !== newRole.rawPosition){
		changed.push("position")
	}
	console.log(changed)
	const changeEmbed = new MessageEmbed()
	.setTitle("Role Updated")
	.setAuthor(executor.tag, executor.displayAvatarURL())
	// console.log(oldRole, newRole)
};
