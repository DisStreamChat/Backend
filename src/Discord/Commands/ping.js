module.exports = {
	name: "ping",
	aliases: ["🏓"],
	description: "delete multiple messages",
	execute: async (message, args, client) => {
		const ping = await message.channel.send("Pong!");
		message.react("🏓");
		ping.edit(`Pong! Latency is \`${ping.createdTimestamp - message.createdTimestamp}ms\`. Bot ping is \`${client.ws.ping}ms\` 💓`);
	},
};
