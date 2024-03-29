import { logUpdate } from "./utils";
import setupLogging from "./utils/setupLogging";

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

	const [channelIds, active] = await setupLogging(guild, "channelUpdate", client);
	if (!active) return;

	const embed = await logUpdate(newChannel, oldChannel, {
		keyMap,
		valueMap,
		title: `:pencil: Text Channel updated: ${oldChannel.name}`,
		footer: `Channel ID: ${oldChannel.id}`,
		ignoredDifferences,
	});

	if (!channelIds) return;
	for (const channelId of channelIds) {
		const logChannel = guild.channels.resolve(channelId);

		logChannel.send(embed);
	}
};
