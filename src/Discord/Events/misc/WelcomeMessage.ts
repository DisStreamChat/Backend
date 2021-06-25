import { Guild, GuildMember, MessageAttachment, TextChannel } from 'discord.js';
import Mustache from 'mustache';

import { DiscordClient } from '../../../clients/discord.client';
import { generateWelcomeCard, getDiscordSettings } from '../../../utils/functions';
import generateView from '../../Commands/CustomCommands/GenerateView';

Mustache.tags = ["{", "}"];

export default async (guild: Guild, member: GuildMember, client: DiscordClient) => {
	const data = await getDiscordSettings({ client, guild: guild.id });
	if (!data) return;
	if (!data.activePlugins["welcome-message"]) return;
	const view = generateView({ message: { member: member, author: member }, args: [] });
	const message = Mustache.render(data.welcomeMessage.message, view).replace(/&lt;/gim, "<").replace(/&gt;/gim, ">");
	const channelId = data.welcomeMessage.channel;
	if (!channelId) return;
	const welcomeChannel = guild.channels.resolve(channelId) as TextChannel;

	// if(isPremium(guild)) return welcomeChannel.send(message)
	if (!data.welcomeMessage.welcomeImage) return welcomeChannel.send(message);

	const welcomeImage = await generateWelcomeCard(guild, member, data.welcomeMessage.welcomeImageConfig || {});
	const attachment = new MessageAttachment(welcomeImage, "card.png");

	welcomeChannel.send(message);
	welcomeChannel.send(attachment);
};
