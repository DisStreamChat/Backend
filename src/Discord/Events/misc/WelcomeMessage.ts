import Mustache from "mustache";

import { getDiscordSettings } from "../../../utils/functions";
import { generateMustacheView } from "../../Commands/CustomCommands/generateMustacheView";

Mustache.tags = ["{", "}"];

export default async (guild, member, client) => {
	const data = await getDiscordSettings({ client, guild: guild.id });
	if (!data) return;
	if (!data.activePlugins["welcome-message"]) return;
	if (!data.welcomeMessage) return;
	const view = generateMustacheView({ message: { member: member, author: member } });
	const message = Mustache.render(data.welcomeMessage.message, view).replace(/&lt;/gim, "<").replace(/&gt;/gim, ">");
	const channelId = data.welcomeMessage.channel;
	if (!channelId) return;
	const welcomeChannel = guild.channels.resolve(channelId);

	// TODO: add welcome card functionality

	welcomeChannel.send(message);
};
