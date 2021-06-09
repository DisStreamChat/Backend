import { SlashCommand } from "../../models/discord.model";
import getUrls from "extract-urls";

import { hasDiscordInviteLink, sleep } from "../../utils/functions";
import { Message } from "discord.js";

const filterMessages = async (message: Message, messages: Message[], filter, input = "") => {
	switch (filter) {
		case "text":
			return messages.filter(msg => {
				const embeds = msg.embeds.length;
				const attachments = msg?.attachments;
				const filter = attachments?.filter(atch => !!atch.height).size;
				return (!embeds && !filter) || msg.id === message.id;
			});
		case "embeds":
			return messages.filter(msg => {
				return msg.embeds.length || msg.id === message.id;
			});
		case "images":
			return messages.filter(msg => {
				const attachments = msg?.attachments;
				const filter = attachments?.filter(atch => !!atch.height).size || msg.id === message.id;
				return filter;
			});
		case "mentions":
			return messages.filter(
				msg =>
					msg.mentions.members.first() ||
					msg.mentions.roles.first() ||
					msg.mentions.channels.first() ||
					msg.id === message.id
			);
		case "user":
			return messages.filter(msg => !msg.author.bot || msg.id === message.id);
		case "humans":
			return messages.filter(msg => !msg.author.bot || msg.id === message.id);
		case "bots":
			return messages.filter(msg => msg.author.bot || msg.id === message.id);
		case "links":
			return messages.filter(msg => {
				const urls = [...getUrls(msg.content)];
				return urls.length || msg.id === message.id;
			});
		case "invites":
			const invites = await Promise.all(
				messages.map(async msg => {
					const hasInvite = await hasDiscordInviteLink(getUrls(msg.content));
					const isCommand = msg.id === message.id;
					return hasInvite || isCommand ? msg.id : null;
				})
			);
			return messages.filter(msg => invites.includes(msg.id));
		case "from":
			return messages.filter(msg => msg.author.id === input);
		default:
			return messages;
	}
};

const fetchMessages = async (message, amount, filter = "", input = "") => {
	let messages = [];
	let after = message.id;
	while (messages.length < amount) {
		const options = { limit: 100, after: null };
		if (after) options.after = after;
		const allMessages = (await message.channel.messages.fetch(options)).array();
		const filteredMessages = await filterMessages(message, allMessages, filter, input);
		messages = [...messages, ...filteredMessages];
		after = allMessages[allMessages.length - 1]?.id;
	}
	return messages.slice(0, amount);
};

const fetchAmountfromId = async (message, id) => {
	let after;
	let messageToDelete;
	let messages = [];
	for (let i = 0; i < 10; i++) {
		const options = { limit: 100, after: null };
		if (after) options.after = after;
		const allMessages = await message.channel.messages.fetch(options);
		messageToDelete = allMessages.get(id);
		messages = [...messages, ...allMessages.array()];
		if (messageToDelete) break;
		after = allMessages.last();
	}
	let amount;
	if (messageToDelete) {
		amount = messages.findIndex(msg => msg.id === messageToDelete.id) + 1;
	}
	return amount;
};

const hasOldMessage = async messages => {
	const now = new Date().getTime();
	const fourteenDaysAgo = new Date(now - 1.21e9).getTime();
	for (const message of messages) {
		if (message.createdAt < fourteenDaysAgo) {
			return true;
		}
	}
};

const purgeMessages = async (messages, message) => {
	if ((await hasOldMessage(messages)) || messages.length > 100) {
		try {
			for (const msg of messages) {
				await msg.delete();
				await sleep(350);
			}
		} catch (err) {}
	} else {
		await message.channel.bulkDelete(messages);
	}
};

const purge: SlashCommand = {
	name: "purge",
	description: "delete all messages with a given criteria",
	options: [
		{
			name: "amount",
			description: "the number of messages to be deleted",
			type: 4,
			required: false,
		},
		{
			name: "user",
			description: "only delete messages from this user",
			type: 6,
			required: false,
		},
		{
			name: "message_id",
			description: "delete all message up to the given message id",
			type: 3,
			required: false,
		},
		{
			name: "bot",
			description: "true or false, only delete messages sent by bots",
			type: 5,
			required: false,
		},
		{
			name: "filter",
			description: "extra options to filter deleted messages by",
			type: 3,
			required: false,
			choices: [
				{
					name: "Has images",
					value: "image",
				},
				{
					name: "Has links",
					value: "link",
				},
			],
		},
	],
	execute: async interaction => {
		interaction.ephemeral();
		const { amount, message_id, filter, bot, user } = interaction.arguments;
		let trueAmount = amount;
		if (message_id) {
			trueAmount = await fetchAmountfromId(interaction, message_id);
		}
		const messages = await fetchMessages(interaction, trueAmount);
		await interaction.reply(`Deleting ${messages.length} messages`)
		await purgeMessages(messages, interaction);
		interaction.edit(`Deleted ${messages.length} messages`);
	},
};

export default purge;
