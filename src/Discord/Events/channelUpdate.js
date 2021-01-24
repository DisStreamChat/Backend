import admin from "firebase-admin";
import { MessageEmbed } from "discord.js";
import setupLogging from "./utils/setupLogging";
import { compare } from "../../utils/functions";

const ignoredDifferences = ["permissionOverwrites"];

const keyMap = {
	rateLimitPerUser: "slowmode",
	slowmode: "rateLimitPerUser",
};

const valueMap = {
	rateLimitPerUser: (value) => !value ? "Off" : `${value} Seconds`,
	topic: (value) => !value ? "No Topic" : value
}

module.exports = async (oldChannel, newChannel, client) => {
	const guild = newChannel.guild;
	const differences = compare(oldChannel, newChannel);
	const differenceKeys = Object.keys(differences).filter(key => !differences[key] && !ignoredDifferences.includes(key));

	const [channelId, active] = await setupLogging(guild, "channelUpdate", client);
	if (!active) return;

	const embed = new MessageEmbed()
		.setTitle(`:pencil: Text channel updated: ${oldChannel.name}`)
		.setFooter(`Channel ID: ${oldChannel.id}`)
		.setTimestamp(new Date())
		.setColor("#faa51b")

	for (const change of differenceKeys) {
		const newValue = valueMap[change]?.(newChannel[change]) || newChannel[change] || "None"
		const oldValue = valueMap[change]?.(oldChannel[change]) || oldChannel[change] || "None"
		embed.addField((keyMap[change] || change).capitalize(), `${oldValue} -> ${newValue}`);
	}

	if (!channelId) return;
	const logChannel = guild.channels.resolve(channelId);

	logChannel.send(embed);
	// console.log(oldChannel, newChannel)
};
