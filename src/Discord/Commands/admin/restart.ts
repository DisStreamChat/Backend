require("dotenv").config()

export default {
	name: "restart",
	id: "restart",
	category: "admin",
	aliases: [],
    description: "Restarts the Client.",
	adminOnly: true,
	execute: async (message, args, client) => {
		const token = client.token
		const msg = await message.channel.send("Restarting...");
		await client.destroy();
		await client.login(token);
		await msg.edit("Restarted");
	},
};
