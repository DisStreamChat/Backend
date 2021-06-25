import { GuildMember, MessageEmbed, TextChannel } from "discord.js";
import setupLogging from "./utils/setupLogging";
import deepEqual from "deep-equal";
import { DiscordClient } from "../../clients/discord.client";
import { writeToAuditLog } from "./utils/auditLog";
import { isPremium } from "../../utils/functions";

const changeFuctions = {
	nickname: (member: GuildMember, newName: string, oldName: string) => {
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

export default async (oldMember: GuildMember, newMember: GuildMember, client: DiscordClient) => {
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
			const [channelIds, active] = await setupLogging(guild, "NicknameChange", client);
			if (!active || !channelIds) continue;

			const embed: MessageEmbed = changeFuctions[change](
				newMember,
				oldMember.nickname ?? oldMember.user.username,
				newMember.nickname ?? newMember.user.username
			);
			for (const channelId of channelIds) {
				const logChannel = guild.channels.resolve(channelId) as TextChannel;

				logChannel.send(embed);
			}
			if (await isPremium(guild)) {
				writeToAuditLog(guild, "member updated", { embed: embed.toJSON() });
			}
		}
	}
};
