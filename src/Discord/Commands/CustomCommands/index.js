// the admin app has already been initialized in routes/index.js
const admin = require("firebase-admin");
const path = require("path");
const fs = require("fs");
import Mustache from "mustache";
import GenerateView from "./GenerateView";
import handleRoleCommand from "./handleRoleCommand";

Mustache.tags = ["{", "}"];
// Mustache.escape = text => text

const funcRegex = /\((\w+)\s?([\w\s+-/<>]*)\)/gi;

const replaceFunc = text => text.replace(funcRegex, (match, p1, p2, offset, string) => `{#${p1}}${p2 || ""}{/${p1}}`);

const replaceArgs = (text, args) => text.replace(/{(\d+)}/gm, (match, p1, p2, offset, string) => "" + args[+p1 - 1]);

Mustache.tags = ["{", "}"];
// Mustache.escape = text => text

const funcRegex = /\((\w+)\s?([\w\s+-/<>]*)\)/gi;

const replaceFunc = text => text.replace(funcRegex, (match, p1, p2, offset, string) => `{#${p1}}${p2 || ""}{/${p1}}`);

const replaceArgs = (text, args) => text.replace(/{(\d+)}/gm, (match, p1, p2, offset, string) => "" + args[+p1 - 1]);

module.exports = async ({ command, args, message, client }) => {
	const view = GenerateView({ message, args });
	const guildRef = await admin.firestore().collection("customCommands").doc(message.guild.id).get();
	const guildData = guildRef.data();
	if (guildData) {
		for (const [key, value] of Object.entries(guildData)) {
			if (key === command || command === value.name || value?.aliases?.includes?.(command)) {
				let text = replaceArgs(value.message, args);
				text = replaceFunc(text);
				if (!value.type || value.type === "text") {
					let text = replaceArgs(value.message, args);
					text = replaceFunc(text);
					return await message.channel.send(Mustache.render(text, view).replace(/&lt;/gim, "<").replace(/&gt;/gim, ">"));
				} else {
					handleRoleCommand(value, message, client);
				}
			}
		}
	} else {
		return;
	}
};
