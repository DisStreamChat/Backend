const { MessageEmbed } = require("discord.js");
import fetch from "fetchio-js";

export default {
	name: "vote",
	aliases: [],
	id: "vote",
	category: "misc",
	description: "Get the link to vote for disstreambot on top.gg",
	usage: [],
	execute: async (msg, args, bot) => {
		msg.channel.send("You can vote for DisStreamBot by visiting http://vote.disstreamchat.com. Thank you!")
	},
};
