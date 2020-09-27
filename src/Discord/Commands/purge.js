module.exports = {
	name: "purge",
	aliases: ["massdelete", "prune"],
	description: "Delete multiple messages at once.",
	usage: ["<amount>"],
	permissions: ["MANAGE_MESSAGES"],
	//TODO: check MANAGE_MESSAGES for the channel not the server
	execute: async (message, args, client) => {
		if(args.length === 0) return await message.channel.send("Please provide a number between 1 and 99.")
		const amount = +args[0] + 1;
		//TODO: add confirmation and functionality for 100+ deletions
		if(amount > 100){
			return message.channel.send("Maximum amount of messages to delete is 99.")
		}
		if(amount < 2){
			return message.channel.send("Minimum amount of messages to delete is 1.")
		}

		const messages = await message.channel.messages.fetch({ limit: amount });
		for(message of messages.values()){
			await message.delete();
			await new Promise(resolve => setTimeout(resolve,300)) 
		}
		
		const msg = await message.channel.send(`Deleted ${amount-1} messages`);
		setTimeout(() => {
			msg.delete();
		}, 3000);
	},
};
