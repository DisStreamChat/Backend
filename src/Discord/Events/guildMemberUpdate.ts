import { MessageEmbed } from "discord.js";
import setupLogging from "./utils/setupLogging";
const deepEqual = require("deep-equal");

const changeFuctions = {
	nickname: (member, newName, oldName) => {
		return new MessageEmbed()
			.setAuthor(member.user.tag, member.user.displayAvatarURL())
			.setDescription(`:pencil: ${member} **nickname edited**`)
			.addField("Old nickname", `\`${oldName}\``, true)
			.addField("New nickname", `\`${newName}\``, true)
			.setTimestamp(new Date())
			.setThumbnail(member.user.displayAvatarURL())
			.setColor("#faa51b");
	},
};

export default async (oldMember, newMember, client) => {
	const guild = newMember.guild;

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

	for (const change of changes) {
		if (change === "nickname") {
			const [channelId, active] = await setupLogging(guild, "NicknameChange", client);
			if (!active || !channelId) continue;

			const logChannel = guild.channels.resolve(channelId);
			
			const embed = changeFuctions[change](
				newMember,
				oldMember.nickname ?? oldMember.user.username,
				newMember.nickname ?? newMember.user.username
			);
			logChannel.send(embed);
		}
	}
};
