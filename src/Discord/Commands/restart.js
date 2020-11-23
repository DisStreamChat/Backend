require("dotenv").config()

module.exports = {
	name: "restart",
	id: "restart",
	category: "admin",
	aliases: [],
    description: "Restarts the Client.",
	adminOnly: true,
	execute: async (message, args, client) => {
		const msg = await message.channel.send("Restarting...");
		await client.destroy();
		await client.login(process.env.BOT_TOKEN);
		await message.channel.send("Restarted");
	},
};
