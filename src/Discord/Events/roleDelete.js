import admin from "firebase-admin";
import { MessageEmbed } from "discord.js";
import setupLogging from "./utils/setupLogging";

module.exports = async role => {
    const guild = role.guild;
    if(!guild) return

    const [channelId, active] = await setupLogging(guild, "roleDelete", client)
    if(!active) return
    
	const embed = new MessageEmbed()
		.setDescription(`:inbox_tray: The role: ${role.name} **was deleted**`)
		.setFooter(`ID: ${role.id}`)
		.setTimestamp(new Date())
		.setColor("#ee1111");

	if (!channelId) return;

	const logChannel = guild.channels.resolve(channelId);

	logChannel.send(embed);
};