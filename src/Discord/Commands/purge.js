module.exports = {
	name: "purge",
	aliases: ["massdelete", "prune"],
	description: "delete multiple messages",
	permissions: ["MANAGE_MESSAGES"],
	execute: async (message, args, client) => {
        if(args.length === 0) return await message.channel.send("You need to tell me how many messages to delete")
		const amount = +args[0] + 1;
        if (amount > 100) return message.channel.send("I can only delete up to 100 messages at a time");
        if(amount < 2) return message.channel.send("I can't delete a negative number of messages") 
		await message.channel.bulkDelete(amount);
		const msg = await message.channel.send(`Deleted ${amount} messages`);
		setTimeout(() => {
			msg.delete();
		}, 1000);
	},
};
