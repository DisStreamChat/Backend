const { adminWare, modWare, setArray } = require("./functions");
class Command {
	constructor({ name, plugin, adminOnly, permissions, id, category, aliases, description, usage, execute }) {
		this.name = name;
		this.plugin = plugin;
		this.id = id || name;
		this.category = category;
		this.aliases = setArray(aliases);
		this.description = description;
		this.usage = setArray(usage);
		this.rawExecute = execute;
		this.permissions = permissions || [];
		if (adminOnly) {
			this.execute = (message, args, client) => adminWare(message, args, client, execute);
		} else if (permissions?.length > 0) {
			this.execute = (message, args, client) => modWare(message, args, client, permissions, execute);
		} else {
			this.execute = execute;
		}
	}
}

module.exports = {
	Command,
};
