import { MessageEmbed, Role, TextChannel } from "discord.js";
import { DiscordClient } from "../../clients/discord.client";
import { writeToAuditLog } from "./utils/auditLog";
import setupLogging from "./utils/setupLogging";

export default async (role: Role, client: DiscordClient) => {
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
		const logChannel = guild.channels.resolve(channelId) as TextChannel;

		logChannel.send(embed);
	}
	// if(isPremium(guild))
	writeToAuditLog(guild, "invite created", { role });
};
