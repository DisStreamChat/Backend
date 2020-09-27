const { isAdmin, hasPermsission } = require("../../utils/functions");
const { MessageEmbed } = require("discord.js");

const getCommands = (message, client) => {
	let availableCommands = [];
	for (const [key, command] of Object.entries(client.commands)) {
		if (!command.adminOnly && !command.permissions?.length) {
			availableCommands.push({ displayName: key, ...command });
			continue;
		} else if (command.adminOnly && isAdmin(message.author)) {
			availableCommands.push({ displayName: key, ...command });
			continue;
		} else if (command.permissions?.length && hasPermsission(message.member, command.permissions || [])) {
			availableCommands.push({ displayName: key, ...command });
			continue;
		}
	}
	return availableCommands;
};

module.exports = {
	name: "help",
	aliases: [],
    description: "See the commands you can use and get on help on each command",
    usage: "(command_name)",
	execute: async (message, args, client) => {
		let availableCommands = getCommands(message, client);
		if (args.length === 0) {
			const helpEmbed = new MessageEmbed()
				.setTitle("DisStreambot Help")
				.setDescription("Here are all the available commands")
				.setThumbnail(client.user.displayAvatarURL())
				.setAuthor("DisStreamBot Commands", client.user.displayAvatarURL())
				.addField("Available Commands", availableCommands.map(command => `\`${command.displayName}\``).join(", "))
				.addField("Tip", "Type `help <command name>` to get help on a specific command ")
				.setTimestamp(message.createdAt)
				.setColor("#206727");
			if (hasPermsission(message.member, ["MANAGE_SERVER", "ADMINISTRATOR"])) {
				helpEmbed.addField(
					"Moderator Tip",
					"Type `!help module` to get informations about the available module or help module <module name> for help on a specific module"
				);
			}
			if (isAdmin(message.author)) {
				helpEmbed.addField("DisStreamChat Admin Tip", "Type `!help admin` to links to DisStreamChat admin tools");
			}
			await message.channel.send(helpEmbed);
		} else if (args[0] !== "module" && args[0] !== "admin") {
			const selectedCommand = availableCommands.find(command => command.displayName?.toLowerCase() === args[0]?.toLowerCase());
			if (!selectedCommand) {
				await message.channel.send(":x: Command not found, use help to get the list of available commands");
			} else {
				const commandHelpEmbed = new MessageEmbed()
					.setTitle(`Help for ${args[0].capitalize()}`)
					.setTimestamp(message.createdAt)
					.setColor("#206727")
                    .setAuthor("DisStreamBot Commands", client.user.displayAvatarURL())
                    .addField("Description", selectedCommand.description)
                    .addField("Parameters. <> => Required. () => optional", selectedCommand.usage?.join("\n") || "None")
					.setThumbnail(client.user.displayAvatarURL());
				await message.channel.send(commandHelpEmbed);
			}
		}
	},
};
