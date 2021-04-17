import { MessageEmbed } from "discord.js";
import setupLogging from "./utils/setupLogging";

export default async (invite, client) => {
	const guild = invite.guild;
	if (!guild) return;

	const [channelIds, active] = await setupLogging(guild, "InviteCreate", client);
	if (!active) return;

	const embed = new MessageEmbed()
		.setAuthor("DisStreamBot")
		.setDescription(`:inbox_tray: The invite: ${invite.url} **was created**`)
		.setFooter(`Code: ${invite.code}`)
		.setTimestamp(new Date())
		.setColor("#11ee11");

	for (const channelId of channelIds) {
		if (!channelId) return;

		const logChannel = guild.channels.resolve(channelId);

		logChannel.send(embed);
	}
};
