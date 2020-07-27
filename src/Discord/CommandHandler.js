const path = require("path");
const fs = require("fs");
const { adminWare, modWare } = require("../utils/functions");
const commandPath = path.join(__dirname, "Commands");
const commandFiles = fs.readdirSync(commandPath);
const commands = {};

// TODO: use WalkSync to allow for nested folders in command directory
commandFiles.forEach(command => {
	if (command.endsWith(".js")) {
		const commandObj = require(path.join(commandPath, command));
		const _ = [commandObj.name, ...commandObj.aliases].map(name => {
			commands[name] = commandObj;
		});
	}
});

// the admin app has already been initialized in routes/index.js
const admin = require("firebase-admin");

const prefix = "!";

module.exports = async (message, client) => {
	if (!message.content.startsWith(prefix)) return;
	const args = message.content.split(" ");
	const command = args.shift().slice(1);
	const commandObj = commands[command];
	if (!commandObj) {
		const guildRef = await admin.firestore().collection("customCommands").doc(message.guild.id).get();
		const guildData = guildRef.data();
		if (guildData) {
			for(const [key, value] of Object.entries(guildData)){
                if(key === command || command === value.name || value.aliases.includes(command)){
                    return await message.channel.send(value.message)
                }
            }
		} else {
			return;
		}
	} else {
		if (commandObj.adminOnly) await adminWare(message, args, client, commandObj.execute);
		else if (commandObj.permissions) await modWare(message, args, client, commandObj.permissions, commandObj.execute);
		else await commandObj.execute(message, args, client);
	}
};
