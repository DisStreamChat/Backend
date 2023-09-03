import { MessageEmbed } from "discord.js";

import setupLogging from "./utils/setupLogging";

export default async (role, client) => {
	const guild = role.guild;
	if (!guild) return;

	const [channelIds, active] = await setupLogging(guild, "roleCreate", client);
	if (!active) return;

	const embed = new MessageEmbed()
		.setDescription(`:inbox_tray: The role: ${role} **was created**`)
		.setFooter(`ID: ${role.id}`)
		.setTimestamp(role.createdAt)
		.setColor("#11ee11");

	for (const channelId of channelIds) {
		const logChannel = guild.channels.resolve(channelId);

		logChannel.send(embed);
	}
};
