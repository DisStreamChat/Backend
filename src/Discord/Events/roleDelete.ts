import { MessageEmbed } from "discord.js";

import setupLogging from "./utils/setupLogging";

export default async (role, client) => {
	const guild = role.guild;
	if (!guild) return;

	const [channelIds, active] = await setupLogging(guild, "roleDelete", client);
	if (!active) return;

	const embed = new MessageEmbed()
		.setDescription(`:inbox_tray: The role: ${role.name} **was deleted**`)
		.setFooter(`ID: ${role.id}`)
		.setTimestamp(new Date())
		.setColor("#ee1111");

	for (const channelId of channelIds) {
		const logChannel = guild.channels.resolve(channelId);

		logChannel.send(embed);
	}
};
