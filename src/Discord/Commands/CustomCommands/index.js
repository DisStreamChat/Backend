// the admin app has already been initialized in routes/index.js
const admin = require("firebase-admin");
const path = require("path");
const fs = require("fs");
const { ArrayAny } = require("../../../utils/functions");
import Mustache from "mustache";
import prettyMilliseconds from "pretty-ms";
import GenerateView from "./GenerateView";
import handleRoleCommand from "./handleRoleCommand";

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
				// check if this command is still cooling down
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
                console.log(value.permittedRoles, roleIds)
				if (value.permittedRoles?.length) {
					if (!ArrayAny(value.permittedRoles, roleIds)) {
                        console.log("allowed")
						const res = await message.channel.send(":x: You don't have permission to use this command");
						setTimeout(() => {
							res.delete();
							message.delete();
                        }, 300);
                        return
					}
				}
				if (value.bannedRoles?.length) {
					if (ArrayAny(value.bannedRoles, roleIds)) {
						const res = await message.channel.send(":x: You don't have permission to use this command");
						setTimeout(() => {
							res.delete();
							message.delete();
                        }, 300);
                        return
					}
				}

				// execute text and role commands differently
				if (!value.type || value.type === "text") {
					let text = replaceArgs(value.message, args);
					text = replaceFunc(text);
					await message.channel.send(Mustache.render(text, view).replace(/&lt;/gim, "<").replace(/&gt;/gim, ">"));
				} else {
					await handleRoleCommand(value, message, client);
				}

				// update the commands last time used
				await admin
					.firestore()
					.collection("customCommands")
					.doc(message.guild.id)
					.update({ [`${key}.lastUsed`]: message.createdAt.getTime() });
			}
		}
	} else {
		return;
	}
};
