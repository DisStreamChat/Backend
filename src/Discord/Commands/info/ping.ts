const { MessageEmbed } = require("discord.js");

export default {
	name: "ping",
	aliases: ["🏓"],
	id: "ping",
	category: "info",
    description: "Get the Ping the bot and the sender.",
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
				{ name: `${message.author.username}'s Ping:`, value: `${Math.abs(Math.floor((msg.createdAt - message.createdAt) - client.ws.ping))}ms` },
			)

		msg.edit(pingembed)
	},
};
