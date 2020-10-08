import admin from "firebase-admin";
import { MessageEmbed } from "discord.js";
import messageManipulation from "../../utils/messageManipulation";
const rdiff = require("recursive-diff");

module.exports = async (oldRole, newRole) => {
	await new Promise(res => setTimeout(res, 300));
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
	if (!oldRole.permissions.equals(newRole.permissions.bitfield)) {
		changed.push("permissions");
	}
	if (oldRole.rawPosition !== newRole.rawPosition) {
		changed.push("position");
	}
	console.log(changed);
	const changeEmbed = new MessageEmbed()
		.setTitle("Role Updated")
		.setAuthor(executor.tag, executor.displayAvatarURL())
		.setColor("#faa51b")
		.setDescription(`Changes have been made to the role: ${newRole} by ${executor}`);

	for (const change of changed) {
		switch (change) {
			case "name":
				changeEmbed.addField("Name Changed", `old: \`${oldRole.name}\` -> new: \`${newRole.name}\``);
				break;
			case "color":
				changeEmbed.addField("Color Changed", `old: \`${oldRole.hexColor}\` -> new: \`${newRole.hexColor}\``);
				break;
			case "permissions":
				// TODO: improve parsing
				changeEmbed.addField(
					"Permissions Changed",
					`Changes: \`${JSON.stringify(rdiff.getDiff(oldRole.permissions.serialize(), newRole.permissions.serialize()))}\``
				);
				break;
			// TODO: add mentionable, position, and hoist
		}
	}

	const logChannel = guild.channels.resolve(channelId);

	logChannel.send(changeEmbed);
	// console.log(oldRole, newRole)
};
