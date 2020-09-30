// the admin app has already been initialized in routes/index.js
const admin = require("firebase-admin");
const path = require("path");
const fs = require("fs");
import Mustache from "mustache";
import GenerateView from "./GenerateView";

module.exports = async ({ command, args, message, client }) => {
	const view = GenerateView({message, args})
	const guildRef = await admin.firestore().collection("customCommands").doc(message.guild.id).get();
	const guildData = guildRef.data();
	if (guildData) {
		for (const [key, value] of Object.entries(guildData)) {
			if (key === command || command === value.name || value.aliases.includes(command)) {
				return await message.channel.send(Mustache.render(value.message, view, {}, ["{", "}"]).replace(/&lt;/gim, "<").replace(/&gt;/gim, ">"));
			}
		}
	} else {
		return;
	}
};
