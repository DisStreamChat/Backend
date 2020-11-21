module.exports = {
	name: "servers",
	aliases: [],
	private: true,
	adminOnly: true,
	description: "Get information about the server",
	permissions: ["MANAGE_SERVER", "ADMINISTRATOR"],
	execute: async (message, args, client) => {
		message.channel.send(
			`\`\`\`${client.guilds.cache
				.array()
				.map(guild => guild.name)
				.join("\n")}\`\`\``
		);
	},
};
