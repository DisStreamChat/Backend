import setupLogging from "./utils/setupLogging";
import { logUpdate } from "./utils";
import { writeToAuditLog } from "./utils/auditLog";
import { GuildEmoji, TextChannel } from "discord.js";
import { DiscordClient } from "../../clients/discord.client";
import { isPremium } from "../../utils/functions";

export default async (oldEmoji: GuildEmoji, newEmoji: GuildEmoji, client: DiscordClient) => {
	const guild = newEmoji.guild;

	const [channelIds, active] = await setupLogging(guild, "emojiUpdate", client);
	if (!active) return;

	const embed = await logUpdate(newEmoji, oldEmoji, {
		title: `:pencil: Emoji updated: ${newEmoji}`,
		footer: `Emoji ID: ${oldEmoji.id}`,
		ignoredDifferences: ["_roles"],
	});

	for (const channelId of channelIds) {
		if (!channelId) return;

		const logChannel = guild.channels.resolve(channelId) as TextChannel;

		logChannel.send(embed);
	}
	if (await isPremium(guild)) {
		writeToAuditLog(guild, "channel created", { oldEmoji, newEmoji });
	}
};
