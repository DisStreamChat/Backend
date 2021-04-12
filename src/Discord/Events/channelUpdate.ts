import admin from "firebase-admin";
import { MessageEmbed } from "discord.js";
import setupLogging from "./utils/setupLogging";
import { compare } from "../../utils/functions";
import { logUpdate } from "./utils";

const ignoredDifferences = ["permissionOverwrites"];

const keyMap = {
	rateLimitPerUser: "slowmode",
	slowmode: "rateLimitPerUser",
};

const valueMap = {
	rateLimitPerUser: value => (!value ? "Off" : `${value} Seconds`),
	topic: value => (!value ? "No Topic" : value),
};

export default async (oldChannel, newChannel, client) => {
	const guild = newChannel.guild;

	const [channelId, active] = await setupLogging(guild, "channelUpdate", client);
	if (!active) return;

	const embed = await logUpdate(newChannel, oldChannel, {
		keyMap,
		valueMap,
		title: `:pencil: Text Channel updated: ${oldChannel.name}`,
		footer: `Channel ID: ${oldChannel.id}`,
		ignoredDifferences
	});


	if (!channelId) return;
	const logChannel = guild.channels.resolve(channelId);

	logChannel.send(embed);
};
