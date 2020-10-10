const { resolveUser, generateRankCard } = require("../../utils/functions");
const { MessageAttachment } = require("discord.js");
const path = require("path");
const fs = require("fs");
// the admin app has already been initialized in routes/index.js
const admin = require("firebase-admin");
const { registerFont } = require("canvas");
registerFont(path.join(__dirname, "../../../public/Poppins/Poppins-Regular.ttf"), { family: "Poppins" });

module.exports = {
	name: "leaderboard",
	aliases: [],
	description: "Get the link to the leaderboard for this guild.",
	usage: "leaderboard",
	execute: async (message, args, client) => {
		message.channel.send(`https://www.disstreamchat.com/leaderboard/${message.guild.id}`)
	},
};
