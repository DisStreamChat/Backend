module.exports = {
	name: "purge",
	aliases: ["massdelete", "prune"],
	description: "Delete multiple messages at once. If a message id is given it will delete all messages up to that one",
	usage: ["<amount | message_id>"],
	permissions: ["MANAGE_MESSAGES"],
	//TODO: check MANAGE_MESSAGES for the channel not the server
	execute: async (message, args, client) => {
		if (args.length === 0) return await message.channel.send("Please provide a number between 1 and 99, or a message id.");
		const input = args[0];
		let amount = +args[0] + 1;
		if (input.length > 5) {
			const messages = await message.channel.messages.fetch({ limit: 99 });
			const messageToDelete = await messages.get(input);
			if (messageToDelete) {
				console.log(messages.array().length);
				amount = messages.array().findIndex(msg => msg.id === messageToDelete.id) + 1;
			} else {
				const res = await message.channel.send(":x: message not found");
				setTimeout(() => {
					res.delete();
				}, 300);
			}
		}
		//TODO: add confirmation and functionality for 100+ deletions
		if (amount > 100) {
			return message.channel.send("Maximum amount of messages to delete is 99.");
		}
		if (amount < 2) {
			return message.channel.send("Minimum amount of messages to delete is 1.");
		}
		client.deleter = message.author;
		const messages = await message.channel.messages.fetch({ limit: amount });
		for (message of messages.values()) {
			await message.delete();
			await new Promise(resolve => setTimeout(resolve, 350));
		}
		const msg = await message.channel.send(`Deleted ${amount - 1} messages`);
		setTimeout(() => {
			msg.delete();
			client.deleter = null;
		}, 3000);
	},
};
