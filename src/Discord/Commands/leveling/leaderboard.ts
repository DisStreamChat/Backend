// the admin app has already been initialized in routes/index.js

export default {
	name: "leaderboard",
	aliases: [],
	plugin: "leveling",
	id: "leaderboard",
	category: "leveling",
	description: "Get the link to the leaderboard for this guild.",
	usage: ["leaderboard"],
	execute: async (message, args, client) => {
		message.channel.send(`https://www.disstreamchat.com/leaderboard/${message.guild.id}`);
	},
};
