export default {
	name: "dashboard",
	id: "dashboard",
	category: "manager",

	aliases: [],
	description: "Get the link to the bot dashboard for this guild.",
	permissions: ["MANAGE_SERVER", "ADMINISTRATOR"],
	execute: async (message, args, client) => {
		message.channel.send(`https://www.disstreamchat.com/dashboard/discord/${message.guild.id}`);
	},
};
