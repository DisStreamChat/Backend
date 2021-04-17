import { MessageEmbed } from "discord.js";
import setupLogging from "./utils/setupLogging";

export default async (channel, client) => {
	const guild = channel.guild;

	const [channelIds, active] = await setupLogging(guild, "channelDelete", client);
	if (!active) return;

	let parentCheck = "";
	if (channel.parentID) {
		parentCheck = `(Parent ID: ${channel.parentID})`;
	}

	const embed = new MessageEmbed()
		//.setAuthor(member.user.tag, member.user.displayAvatarURL())
		//.setThumbnail(member.user.displayAvatarURL())
		.setDescription(`:outbox_tray: ${channel.name} **channel deleted**`)
		.setFooter(`ID: ${channel.id} ${parentCheck}`)
		.setTimestamp(new Date())
		.setColor("#ee1111");

	for (const channelId of channelIds) {
		if (!channelId) return;
		const logChannel = guild.channels.resolve(channelId);

		logChannel.send(embed);
	}
};
