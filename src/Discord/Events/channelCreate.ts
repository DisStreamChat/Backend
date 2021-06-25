import { GuildChannel, MessageEmbed, TextChannel } from "discord.js";

import { DiscordClient } from "../../clients/discord.client";
import { writeToAuditLog } from "./utils/auditLog";
import setupLogging from "./utils/setupLogging";

export default async (channel: GuildChannel, client: DiscordClient) => {
	const guild = channel.guild;

	const [channelIds, active] = await setupLogging(guild, "channelCreate", client);
	if (!active) return;

	let parentCheck = "";
	if (channel.parentID) {
		parentCheck = `(Parent ID: ${channel.parentID})`;
	}

	const embed = new MessageEmbed()
		.setDescription(`:inbox_tray: ${channel.name} **channel created**`)
		.setFooter(`ID: ${channel.id} ${parentCheck}`)
		.setTimestamp(new Date())
		.setColor("#11ee11");

	for (const channelId of channelIds) {
		if (!channelId) return;
		const logChannel = guild.channels.resolve(channelId) as TextChannel;

		logChannel.send(embed);
	}
	// if(isPremium(guild))
	writeToAuditLog(guild, "channel created", {channel })
};
