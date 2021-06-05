import { MessageButton } from "discord-buttons";

export default {
	name: "leaderboard",
	aliases: [],
	plugin: "leveling",
	id: "leaderboard",
	category: "leveling",
	description: "Get the link to the leaderboard for this guild.",
	usage: ["leaderboard"],
	execute: async (message, args, client) => {
		const button = new MessageButton()
			.setStyle("url")
			.setLabel(`${message.guild.name}'s Leaderboard`)
			.setURL(`https://www.disstreamchat.com/leaderboard/${message.guild.id}`);

		message.channel.send("​", button);
	},
};
