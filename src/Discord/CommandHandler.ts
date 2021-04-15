;
import path from "path";
import fs from "fs";
const { getDiscordSettings, walkSync } = require("../utils/functions");
const commandPath = path.join(__dirname, "Commands");
const commandFiles = walkSync(fs.readdirSync(commandPath), commandPath);
const commands = {};
import customCommandHandler from "./Commands/CustomCommands";
import { Command } from "../utils/classes";

commandFiles.forEach(command => {
	if (command.name.endsWith(".js")) {
		let commandObj = require(command.path);
		if (commandObj.id) {
			commandObj = new Command(commandObj)
			const _ = [commandObj.name, ...(commandObj.aliases || [])].map(name => {
				commands[name] = commandObj;
			});
		}
	}
});

export default async (message, client) => {
	if (!client.commands) {
		client.commands = commands;
	}
	let prefix = "!";
	try {
		const settings = await getDiscordSettings({ client, guild: message.guild.id });
		prefix = settings?.prefix || "!";
	} catch (err) {}
	if (process.env.BOT_DEV == "true") prefix = "?";
	client.prefix = prefix;
	const isMention = message?.mentions?.users?.has(client.user.id);
	let isCommand = message.content.startsWith(prefix) || isMention;
	if (!isCommand) return;
	if (isMention) {
		message.content = message.content.replace(new RegExp(`<@!?${client.user.id}> `), "");
	}
	const args = message.content.split(" ");
	let command = args.shift();
	if (!isMention) {
		command = command.slice(prefix.length);
	}
	const commandObj = commands[command];
	if (!commandObj) {
		customCommandHandler({ message, args, client, command });
	} else {
		await commandObj.execute(message, args, client);
	}
};
