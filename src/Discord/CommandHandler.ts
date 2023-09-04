import { Message } from "discord.js";
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

async function getPrefix(message: Message, client): Promise<string | undefined> {
	if (EnvManager.BOT_DEV) return "?";
	try {
		const settings = await getDiscordSettings({ client, guild: message.guild.id });
		return settings?.prefix ?? "!";
	} catch (err) {}
}

function stripBotMentions(msg: string, botId: string): string {
	return msg.replace(new RegExp(`<@!?${botId}> `, "g"), "");
}

export default async (message: Message, client) => {
	if (!client.commands) {
		client.commands = commands;
	}

	const prefix = await getPrefix(message, client);
	const isBotMentioned = message?.mentions?.users?.has(client.user.id);
	const isCommand = message.content.startsWith(prefix) || isBotMentioned;

	if (!isCommand) return;
	if (isBotMentioned) {
		message.content = stripBotMentions(message.content, client.user.id);
	}

	client.prefix = prefix;
	const args = message.content.split(" ");
	let command = args.shift();
	if (!isBotMentioned) {
		command = command.slice(prefix.length);
	}
	const commandObj = commands[command];
	if (!commandObj) {
		customCommandHandler({ message, args, client, command });
	} else {
		await commandObj.execute(message, args, client);
	}
};
