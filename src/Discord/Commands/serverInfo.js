module.exports = {
	name: "serverInfo",
	aliases: ["server-info"],
    description: "Get information about the server",
    permissions: ["MANAGE_SERVER", "ADMINISTRATOR"],
	execute: async (message, args, client) => {
        console.log("hello")
        let availableCommands = getCommands(message, client)
        console.log(availableCommands)
        message.channel.send(availableCommands.map(command => command.displayName).join("\n"))
	},
};