import { sleep, hasDiscordInviteLink } from "../../../utils/functions";
const getUrls = require("get-urls");

const fetchAmountfromId = async (message, id) => {
	const messages = await message.channel.messages.fetch({ limit: 99 });
	const messageToDelete = await messages.get(id);
	let amount;
	if (messageToDelete) {
		amount = messages.array().findIndex(msg => msg.id === messageToDelete.id) + 1;
	} else {
		const res = await message.channel.send(":x: message not found");
		setTimeout(() => {
			res.delete();
		}, 300);
	}
	return amount;
};

const checkAmountLimits = (message, amount) => {
	if (amount > 1000) {
		message.channel.send("Maximum amount of messages to delete is 99.");
		return true;
	}
	if (amount < 2) {
		message.channel.send("Minimum amount of messages to delete is 1.");
		return true;
	}
};

const fetchMessages = async (message, amount) => {
	if (amount <= 100) return (await message.channel.messages.fetch({ limit: amount })).array();

	let messages = [];
	while (amount > 0) {
		const options = { limit: Math.min(100, Math.max(0, amount)) };
		if (messages[messages.length - 1]) options.after = messages[messages.length - 1].id;
		messages = [...messages, ...(await message.channel.messages.fetch(options)).array()];
		amount -= 100;
	}
	return messages;
};

const getMessages = async (message, amount, filter) => {
	let messages = await fetchMessages(message, amount);

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

const hasOldMessage = async messages => {
	const now = new Date();
	const fourteenDaysAgo = new Date(now - 1.21e9);
	for (const message of messages) {
		if (message.createdAt < fourteenDaysAgo) {
			return true;
		}
	}
};

const purgeMessages = async (messages, message) => {
	if ((await hasOldMessage(messages)) || messages.length > 100) {
		for (const msg of messages) {
			await msg.delete();
			await sleep(350);
		}
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

module.exports = {
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
		let amount = +input + 1;
		if (input.length > 5) {
			amount = await fetchAmountfromId(message, input);
			if (!amount) return;
		}
		if (checkAmountLimits(message, amount)) return;
		client.deleter = message.author;
		const messages = await getMessages(message, amount, filter);
		await purgeMessages(messages, message);
		const msg = await message.channel.send(`Deleted ${messages.length - 1} messages`);
		setTimeout(() => {
			msg.delete().then(() => {
				client.deleter = null;
			});
		}, 3000);
	},
};
