module.exports = {
	name: "ping",
	aliases: ["🏓"],
	description: "Ping the bot.",
	execute: async (message, args, client) => {
		message.react("🏓");
		let Pinging = new MessageEmbed()
			.setTitle(`🏓 Pinging...`)

		const msg = await message.channel.send(Pinging);
		let pingembed = new MessageEmbed()
			.setTitle(`🏓 Pong!`)
			.addFields(
				{ name: `**Ping:**`, value: `${Math.floor(msg.createdAt - message.createdAt)}ms` },
				{ name: `${client.user.username}'s Ping:`, value: `${Math.round(client.ws.ping)}ms` },
				{ name: `${message.author.username}'s Ping:`, value: `${Math.floor((msg.createdAt - message.createdAt) - client.ws.ping)}ms` },
			)

		msg.edit(pingembed)
	},
};
