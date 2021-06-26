import path from "path";
import fs from "fs";
import { getDiscordSettings, walkSync } from "../utils/functions";
import { DiscordClient } from "../clients/discord.client";

export const commandFilter = command => command.name.endsWith(".js");

const commandPath = path.join(__dirname, "Commands");

const commandFiles = walkSync(fs.readdirSync(commandPath), commandPath).filter(commandFilter);
const commands = {};
import customCommandHandler from "./Commands/CustomCommands";
import { Command } from "../utils/classes";
import { config } from "../utils/env";

commandFiles.forEach(async command => {
	let { default: commandObj } = require(command.path);
	if (commandObj.id) {
		commandObj = new Command(commandObj);
		const _ = [commandObj.name, ...(commandObj.aliases || [])].map(name => {
			commands[name] = commandObj;
		});
	}
});

export const setCommands = (client: DiscordClient) => {
	if (!client.commands) {
		client.commands = commands;
	}
};

export default async (message, client: DiscordClient) => {
	let prefix = "!";
	try {
		const settings = await getDiscordSettings({ client, guild: message.guild.id });
		prefix = settings?.prefix || "!";
	} catch (err) {}
	if (config.BOT_DEV) prefix = "?";
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
