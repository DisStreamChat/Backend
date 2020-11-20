import admin from "firebase-admin";
import { MessageEmbed } from "discord.js";
import setupLogging from "./utils/setupLogging";

module.exports = async invite => {
    const guild = invite.guild;
    if(!guild) return

    const [channelId, active] = await setupLogging(guild, "InviteDelete", client)
    if(!active) return

	const embed = new MessageEmbed()
		.setAuthor("DisStreamBot")
		.setDescription(`:outbox_tray: The invite: ${invite.url} **was deleted**`)
		.setFooter(`Code: ${invite.code}`)
		.setTimestamp(new Date())
		.setColor("#ee1111");
		
	if (!channelId) return;

	const logChannel = guild.channels.resolve(channelId);

	logChannel.send(embed);
};
