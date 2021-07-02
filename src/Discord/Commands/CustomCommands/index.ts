import { Message, MessageEmbed } from "discord.js";
import admin from "firebase-admin";
import Mustache from "mustache";
import prettyMilliseconds from "pretty-ms";

import { DiscordClient } from "../../../clients/discord.client";
import { ArrayAny, isPremium } from "../../../utils/functions";
import GenerateView from "./GenerateView";
import handleRoleCommand from "./handleRoleCommand";

Mustache.tags = ["{", "}"];

const funcRegex = /\((\w+)\s?([\w\s+-/<>]*)\)/gi;

export const replaceFunc = text => text.replace(funcRegex, (match, p1, p2, offset, string) => `{#${p1}}${p2 || ""}{/${p1}}`);

export const replaceArgs = (text, args) => text.replace(/{(\d+)}/gm, (match, p1, p2, offset, string) => "" + args[+p1 - 1]);

const processMustacheText = (text: string, args: string[]): string => {
	return replaceFunc(replaceArgs(text, args));
};

interface CustomCommandInputs {
	command: any;
	args: string[];
	message: Message;
	client: DiscordClient;
}

export default async ({ command, args, message, client }: CustomCommandInputs) => {
	const view = GenerateView({ message, args });
	const guildRef = await admin.firestore().collection("customCommands").doc(message.guild.id).get();
	const roleGuildRef = await admin.firestore().collection("roleManagement").doc(message.guild.id).get();
	const guildData = guildRef.data();
	const roleData = roleGuildRef.data();
	const roleCommands = roleData?.commands?.commands || {};
	if (guildData) {
		for (const [key, value] of Object.entries({ ...guildData, ...roleCommands } as { [key: string]: any })) {
			if (key === command || command === value.name || value?.aliases?.includes?.(command)) {
				if (value.allowedChannels?.length) {
					if (!value.allowedChannels.includes(message.channel.id)) return;
				}

				const lastUsed = value.lastUsed || 0;
				const cooldown = value.cooldownTime;
				const now = new Date().getTime();
				if (cooldown) {
					const nextAvailableUse = lastUsed + cooldown;
					if (nextAvailableUse > now) {
						return await message.channel.send(
							`:x: you must wait ${prettyMilliseconds(Math.abs(nextAvailableUse - now))} to use this command`
						);
					}
				}

				// check if the user can use this command based on their roles
				const roles = message.member.roles;
				const roleIds = roles.cache.array().map(role => role.id);
				if (value.permittedRoles) {
					if (!ArrayAny(value.permittedRoles, roleIds)) {
						const res = await message.channel.send(":x: You don't have permission to use this command");
						setTimeout(() => {
							res.delete();
							message.delete();
						}, 2500);
						return;
					}
				}
				if (value.bannedRoles) {
					if (ArrayAny(value.bannedRoles, roleIds)) {
						const res = await message.channel.send(":x: You don't have permission to use this command");
						setTimeout(() => {
							res.delete();
							message.delete();
						}, 2500);
						return;
					}
				}

				if (!value.type) value.type = "text";
				if (value.type === "text") {
					let text = processMustacheText(value.message, args);
					await message.channel.send(Mustache.render(text, view).replace(/&lt;/gim, "<").replace(/&gt;/gim, ">"));
				} else if (value.type === "embed") {
					if (!(await isPremium(message.guild))) return;
					let text = processMustacheText(value.embedMessageData.description, args);
					const description = Mustache.render(text, view).replace(/&lt;/gim, "<").replace(/&gt;/gim, ">");
					const embed = new MessageEmbed({ ...value.embedMessageData, description });
					await message.channel.send(embed);
				} else {
					await handleRoleCommand(value, message, client);
				}

				await admin
					.firestore()
					.collection("customCommands")
					.doc(message.guild.id)
					.update({ [`${key}.lastUsed`]: message.createdAt.getTime() });
				return;
			}
		}
	} else {
		return;
	}
};
