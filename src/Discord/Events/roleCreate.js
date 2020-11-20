import admin from "firebase-admin";
import { MessageEmbed } from "discord.js";
import setupLogging from "./utils/setupLogging";

module.exports = async (role, client) => {
    const guild = role.guild;
    if(!guild) return

    const [channelId, active] = await setupLogging(guild, "roleCreate", client)
    if(!active) return
    
	const embed = new MessageEmbed()
		.setDescription(`:inbox_tray: The role: ${role} **was created**`)
		.setFooter(`ID: ${role.id}`)
		.setTimestamp(role.createdAt)
		.setColor("#11ee11");

	if (!channelId) return;

	const logChannel = guild.channels.resolve(channelId);

	logChannel.send(embed);
};