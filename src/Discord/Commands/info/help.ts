import { isAdmin, hasPermission, ArrayAny, getRoleIds } from "../../../utils/functions";
import { Channel, GuildMember, Message, MessageEmbed, TextChannel } from "discord.js";
import { getDiscordSettings, convertDiscordRoleColor } from "../../../utils/functions";
import { MessageActionRow, MessageButton } from "discord-buttons";

// the admin app has already been initialized in routes/index.js
import admin from "firebase-admin";
import { DiscordClient } from "../../../clients/discord.client";

interface CommandModel {
	plugin: string;
	adminOnly: boolean;
	permissions: string[];
}

const getCommands = async (message, client, plugins = {}) => {
	let availableCommands = [];
	//@ts-ignore
	const commands: [string, any] = Object.entries(client.commands);
	for (const [key, command] of commands) {
		const commandObj = { displayName: key, ...command };
		//check if command is enabled
		const enabled = !!command.plugin ? plugins[command.plugin] : true;
		if (!enabled) continue;
		if (!command.adminOnly && !command.permissions?.length) {
			availableCommands.push(commandObj);
			continue;
		} else if (command.adminOnly && isAdmin(message.author ?? message.user)) {
			availableCommands.push(commandObj);
			continue;
		} else if (command.permissions?.length && (await hasPermission(message.member, command.permissions || []))) {
			availableCommands.push(commandObj);
			continue;
		}
	}
	return availableCommands;
};

const getHelpText = ({ message, client, selectedCommand }) =>
	selectedCommand
		? new MessageEmbed()
				.setTitle(`Help for ${selectedCommand.name.capitalize()}`)
				.setTimestamp(message.createdAt)
				.setColor("#206727")
				.setAuthor("DisStreamBot Commands", client.user.displayAvatarURL())
				.addField("Description", selectedCommand.description || "No Description Provided")
				.addField(
					"Parameters. <> => Required. () => optional",
					(Array.isArray(selectedCommand.usage)
						? selectedCommand.usage?.join?.("\n")
						: selectedCommand.usage) || "None"
				)
				.setThumbnail(client.user.displayAvatarURL())
		: null;

const filterCustomCommands = (commands: { [key: string]: any }, { member, channel }) => {
	let availableCommands = [];
	const RoleIds = getRoleIds(member);
	for (const [key, command] of Object.entries(commands || {})) {
		const commandObj = { displayName: key, ...command };
		const { allowedChannels = [], bannedRoles = [], permittedRoles = [] } = command;
		const hasBannedRole = ArrayAny(bannedRoles, RoleIds);
		const hasPermittedRole = permittedRoles.length === 0 || ArrayAny(permittedRoles, RoleIds);
		const inAllowedChannel = allowedChannels.length === 0 || allowedChannels.includes(channel);
		if (hasBannedRole || !hasPermittedRole || !inAllowedChannel) continue;
		availableCommands.push(commandObj);
	}
	return availableCommands;
};

const addTips = async embed => {
	embed.addField(
		"Tip",
		"Type `help <command name>` for help on a specific commands and `help commands <command name>` to get help on a specific custom command "
	);
	embed.addField(
		"Support Server",
		"If you have any questions or bug reports come tell us at https://discord.disstreamchat.com"
	);
	embed.addField("Custom Commands", "To get more help on custom commands use `help commands`");
	return embed;
};

const maxCommands = 2;
export const generateHelpMessage = async ({ message, client, commands = null, custom = false, page = 1 }) => {
	if (!commands) {
		message.member = message.member ?? await message.guild.members.fetch(message.user.id)
		const guildSettings = await getDiscordSettings({ client, guild: message.guild.id });
		let availableCommands = await getCommands(message, client, guildSettings?.activePlugins || {});
		const guildRef = await admin.firestore().collection("customCommands").doc(message.guild.id).get();
		const guildData = guildRef.data();
		let customCommands = filterCustomCommands(guildData, message);
		const allCommands = [...availableCommands, ...customCommands];
		const commandCategories = availableCommands.reduce((categories, current) => {
			if (categories[current.category]) categories[current.category].push(current);
			else categories[current.category] = [current];
			return categories;
		}, {});
		commands = { ...commandCategories, custom: customCommands };
	}

	const pages = custom
		? Math.ceil(commands.length / (maxCommands * 4))
		: Math.ceil(Object.keys(commands || {}).length / maxCommands);

	const index = (page - 1) * maxCommands;

	const helpEmbed = new MessageEmbed()
		.setTitle("DisStreambot Help")
		.setDescription(`Here are all the available commands.`)
		.addField("Prefix", client.prefix || "!")
		// .setThumbnail(client.user.displayAvatarURL())
		.setAuthor("DisStreamBot Commands", client.user.displayAvatarURL())
		.setTimestamp(message.createdAt)
		.setFooter(`Page ${page}/${pages}`)
		// .setColor(convertDiscordRoleColor(message.guild.me.displayHexColor))
		.addField(
			"Available Commands",
			custom
				? commands
						.slice(index, index + maxCommands * 4)
						.map(command =>
							command.displayName.includes("<:") ? command.displayName : `\`${command.displayName}\``
						)
						.join(", ")
				: Object.entries(commands)
						.slice(index, index + maxCommands)
						.map(([key, value]: [string, any]) => {
							return `**${key}**\n${value.map(command => `\`${command.displayName}\``).join(", ")}\n`;
						})
		)
		.addField(
			"---------------------------------------------------",
			"--------------------------------------------------"
		);

	const leftButton = new MessageButton()
		.setStyle(page <= 1 ? "grey" : "blurple")
		.setLabel("Previous Page")
		.setID(`help_page${page - 1}`)
		.setDisabled(page <= 1);
	const rightButton = new MessageButton()
		.setStyle(page >= pages ? "grey" : "blurple")
		.setLabel("Next Page")
		.setID(`help_page${page + 1}`)
		.setDisabled(page >= pages);
	const deleteButton = new MessageButton().setStyle("red").setLabel("Delete").setID("help_delete").setEmoji("♥");

	const row = new MessageActionRow().addComponent(leftButton).addComponent(rightButton).addComponent(deleteButton);

	return { maxPages: pages, embed: await addTips(helpEmbed), component: row };
};

export default {
	name: "help",
	id: "help",
	category: "info",
	aliases: [],
	description: "See the commands you can use and get on help on each command",
	usage: ["(command_name)"],
	execute: async (message: Message, args, client: DiscordClient) => {
		if (args.length === 0) {
			const {
				embed: helpEmbed,
				maxPages,
				component,
			} = await generateHelpMessage({
				message,
				client,
				page: 1,
			});

			const helpMsg = await message.channel.send({ component: component, embed: helpEmbed } as any);
		}
		// else if (!["module", "admin", "commands"].includes(args[0])) {
		// 	const selectedCommand = allCommands.find(
		// 		command => command.displayName?.toLowerCase() === args[0]?.toLowerCase()
		// 	);
		// 	const commandHelpEmbed = getHelpText({ message, client, selectedCommand });
		// 	if (!commandHelpEmbed) {
		// 		await message.channel.send(":x: Command not found, use help to get the list of available commands");
		// 	} else {
		// 		await message.channel.send(commandHelpEmbed);
		// 	}
		// } else {
		// 	switch (args[0]) {
		// 		case "commands":
		// 			if (args[1]) {
		// 				const commandHelpEmbed = getHelpText({ message, client, selectedCommand: guildData[args[1]] });
		// 				if (!commandHelpEmbed) {
		// 					await message.channel.send(
		// 						":x: Command not found, use `help` to get the list of available commands"
		// 					);
		// 				} else {
		// 					await message.channel.send(commandHelpEmbed);
		// 				}
		// 			} else {
		// 				const availableCustomCommands = await getCommands(message, { commands: guildData });
		// 				const { embed: customHelpEmbed, maxPages } = await generateHelpMessage({
		// 					message,
		// 					client,
		// 					commands: availableCustomCommands,
		// 					custom: true,
		// 					page: 1,
		// 				});
		// 				const helpMsg = await message.channel.send(customHelpEmbed);
		// 				const pageCollector = helpMsg.createReactionCollector(
		// 					(reaction, user) => ["⬅️", "➡️", "❌"].includes(reaction.emoji.name) && !user?.bot
		// 				);
		// 				let currentPage = 1;
		// 				await helpMsg.react("⬅️");
		// 				await helpMsg.react("➡️");
		// 				await helpMsg.react("❌");
		// 				pageCollector.on("end", () => {
		// 					helpMsg.reactions.removeAll();
		// 				});
		// 				pageCollector.on("collect", async reaction => {
		// 					let pageChanged = false;
		// 					switch (reaction.emoji.name) {
		// 						case "⬅️":
		// 							if (currentPage > 1) {
		// 								currentPage -= 1;
		// 								pageChanged = true;
		// 							}
		// 							break;
		// 						case "➡️":
		// 							if (currentPage < maxPages) {
		// 								currentPage += 1;
		// 								pageChanged = true;
		// 							}
		// 							break;
		// 						case "❌":
		// 							pageCollector.stop();
		// 							break;
		// 						default:
		// 							return;
		// 					}
		// 					const senders = reaction.users.cache.array().filter(user => user.id !== client.user.id);
		// 					for (const sender of senders) {
		// 						reaction.users.remove(sender);
		// 					}
		// 					if (pageChanged) {
		// 						helpMsg.edit(
		// 							(
		// 								await generateHelpMessage({
		// 									message,
		// 									client,
		// 									commands: availableCustomCommands,
		// 									custom: true,
		// 									page: currentPage,
		// 								})
		// 							).embed
		// 						);
		// 					}
		// 				});
		// 			}
		// 			break;
		// 	}
		// }
	},
};
