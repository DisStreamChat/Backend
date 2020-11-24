const prettyMs = require("pretty-ms");

module.exports = {
	name: "uptime",
	aliases: ["up"],
	description: "Get the bots uptime",
	execute: (message, args, client) => {
		message.channel.send(`**DisStreamBot** has been up for: ${prettyMs(client.uptime)}`);
	},
};
