module.exports = {
	name: "restart",
	aliases: [],
	description: "Restarts the bot",
	adminOnly: true,
	execute: async (message, args, client) => {
		const msg = await message.channel.send("Restarting...");
		await client.destroy();
		await client.login(process.env.BOT_TOKEN);
		await message.channel.send("Restarted");
	},
};
