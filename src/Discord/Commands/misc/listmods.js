const { isAdmin, hasPermission, ArrayAny, getRoleIds } = require("../../../utils/functions");
const { MessageEmbed } = require("discord.js");
import { getDiscordSettings } from "../../../utils/functions";

// the admin app has already been initialized in routes/index.js
const admin = require("firebase-admin");

module.exports = {
	name: "listmods",
	aliases: ["mods"],
	id: "listmods",
	category: "misc",
	description: "Get a list of all the moderators based on the set moderator roles",
	usage: ["(username | nickname | ping | id)"],
	execute: async (msg, args, client) => {
		const settings = getDiscordSettings({client, guild: msg.guild})

		if(!settings.modRoles) {
			const error = new MessageEmbed().setDescription(":x: No moderator has been set.")
			return msg.channel.send(error)
		}

		

	},
};
