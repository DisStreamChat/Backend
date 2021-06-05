import { MessageButton } from "discord-buttons";

export default {
	name: "vote",
	aliases: [],
	id: "vote",
	category: "misc",
	description: "Get the link to vote for disstreambot on top.gg",
	usage: [],
	execute: async (msg, args, bot) => {
		const button = new MessageButton().setURL("http://vote.disstreamchat.com").setStyle("url").setLabel("Vote for DisStreamBot on top.gg")
		msg.channel.send("**Thank you!**", button);
	},
};
