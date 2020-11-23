const { resolveUser, generateRankCard } = require("../../utils/functions");
const { MessageAttachment } = require("discord.js");
const path = require("path");
const fs = require("fs");
// the admin app has already been initialized in routes/index.js
const admin = require("firebase-admin");
const { registerFont } = require("canvas");
registerFont(path.join(__dirname, "../../../public/Poppins/Poppins-Regular.ttf"), { family: "Poppins" });

module.exports = {
	name: "dashboard",
	id: "dashboard",
	category: "manager",
	
	aliases: [],
	description: "Get the link to the bot dashboard for this guild.",
    permissions: ["MANAGE_SERVER", "ADMINISTRATOR"],
	execute: async (message, args, client) => {
		message.channel.send(`https://www.disstreamchat.com/dashboard/discord/${message.guild.id}`)
	},
};
