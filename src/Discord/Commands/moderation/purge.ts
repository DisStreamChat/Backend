import getUrls from "extract-urls";

import { Duration, setDurationTimeout, sleep } from "../../../utils/duration.util";
import { hasDiscordInviteLink } from "../../../utils/functions";

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
	} else {
		const res = await message.channel.send(":x: message not found or is more than 1000 messages away");
		setDurationTimeout(() => {
			res.delete();
		}, Duration.fromMilliseconds(300));
	}
	return amount;
};

const checkAmountLimits = (message, amount) => {
	if (amount > 1000) {
		message.channel.send("Maximum amount of messages to delete is 999.");
		return true;
	}
	if (amount < 2) {
		message.channel.send("Minimum amount of messages to delete is 1.");
		return true;
	}
};

const fetchMessages = async (message, amount, filter = "") => {
	let messages = [];
	let after = message.id;
	while (messages.length < amount) {
		const options = { limit: 100, after: null };
		if (after) options.after = after;
		const allMessages = (await message.channel.messages.fetch(options)).array();
		const filteredMessages = await filterMessages(message, allMessages, filter);
		messages = [...messages, ...filteredMessages];
		after = allMessages[allMessages.length - 1]?.id;
	}
	return messages.slice(0, amount);
};

const filterMessages = async (message, messages, filter) => {
	switch (filter) {
		case "text":
			return messages.filter(msg => {
				const embeds = msg.embeds.length;
				const attachments = msg?.attachments;
				const filter = attachments?.filter(atch => atch.height).size;
				return (!embeds && !filter) || msg.id === message.id;
			});
		case "embeds":
			return messages.filter(msg => {
				return msg.embeds.length || msg.id === message.id;
			});
		case "images":
			return messages.filter(msg => {
				const attachments = msg?.attachments;
				const filter = attachments?.filter(atch => atch.height).size || msg.id === message.id;
				return filter;
			});
		case "mentions":
			return messages.filter(
				msg => msg.mentions.members.first() || msg.mentions.roles.first() || msg.mentions.channels.first() || msg.id === message.id
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
		default:
			return messages;
	}
};

const getMessages = async (message, amount, filter) => {
	let messages = await fetchMessages(message, amount);
};

const hasOldMessage = async messages => {
	const now = new Date().getTime();
	const fourteenDaysAgo = new Date(now - 1.21e9);
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
				await sleep(Duration.fromMilliseconds(350));
			}
		} catch (err) {}
	} else {
		await message.channel.bulkDelete(messages);
	}
};

const commands = [
	"user",
	// "match",
	// "not",
	// "startswith",
	// "endswith",
	"links",
	"invites",
	"images",
	"mentions",
	"embeds",
	"text",
	"humans",
	"bots",
];

export default {
	name: "purge",
	aliases: ["massdelete", "prune"],
	id: "purge",
	category: "moderation",
	description: "Delete multiple messages at once. If a message id is given it will delete all messages up to that one",
	usage: ["<amount | message_id>"],
	permissions: ["MANAGE_MESSAGES"],
	execute: async (message, args, client) => {
		if (args.length === 0) return await message.channel.send("Please provide a number between 1 and 99, or a message id.");
		let input = args[0];
		let filter;
		if (commands.includes(input)) {
			filter = input;
			input = args[1];
		}
		let amount = Number(input) + 1;
		if (input.length > 5) {
			amount = await fetchAmountfromId(message, input);
			if (!amount) return;
		}
		if (checkAmountLimits(message, amount)) return;
		client.deleter = message.author;
		const messages = await fetchMessages(message, amount, filter);
		await purgeMessages(messages, message);
		const msg = await message.channel.send(`Deleted ${messages.length - 1} message(s)`);
		setDurationTimeout(() => {
			msg.delete().then(() => {
				client.deleter = null;
			});
		}, Duration.fromSeconds(3));
	},
};
