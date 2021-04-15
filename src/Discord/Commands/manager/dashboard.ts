const { resolveUser, generateRankCard } = require("../../../utils/functions");
import { MessageAttachment } from "discord.js";
import path from "path";
import fs from "fs";
// the admin app has already been initialized in routes/index.js
import admin from "firebase-admin";

export default {
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
