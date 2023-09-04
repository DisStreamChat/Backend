import fs from "fs";
import path from "path";

import { EnvManager } from "../utils/envManager.util";
import { getDiscordSettings, walkSync } from "../utils/functions";
import { Command } from "./command";
import customCommandHandler from "./Commands/CustomCommands";

const commandPath = path.join(__dirname, "Commands");
const commandFiles = walkSync(fs.readdirSync(commandPath), commandPath);
const commands = {};
commandFiles.forEach(async command => {
	if (command.name.endsWith(".js")) {
		let { default: commandObj } = require(command.path);
		if (commandObj.id) {
			commandObj = new Command(commandObj);
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
	if (EnvManager.BOT_DEV) prefix = "?";
	client.prefix = prefix;
	const isMention = message?.mentions?.users?.has(client.user.id);
	const isCommand = message.content.startsWith(prefix) || isMention;
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
