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
		const settings = await getDiscordSettings({ client, guild: msg.guild.id });
		if (!settings.modRoles) {
			const error = new MessageEmbed().setDescription(":x: There are no moderator roles set.");
			return msg.channel.send(error);
		}
		const modRoles = await Promise.all(settings.modRoles.map(id => msg.guild.roles.fetch(id)));
		const embed = new MessageEmbed().setTitle("Moderator Roles").setDescription(modRoles.join("\n"));
		msg.channel.send(embed);
	},
};
