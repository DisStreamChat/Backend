const prettyMs = require("pretty-ms");

export default {
	name: "uptime",
	aliases: ["up"],
	id: "uptime",
	category: "info",
	description: "Get the bots uptime",
	execute: (message, args, client) => {
		message.channel.send(`**DisStreamBot** has been up for: ${prettyMs(client.uptime)}`);
	},
};
