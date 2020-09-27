const { resolveUser, formatFromNow } = require("../../utils/functions");
const { MessageEmbed } = require("discord.js");

module.exports = {
	name: "userinfo",
	aliases: ["info"],
	description: "Get a users info.",
	usage: "(user)",
	execute: async (msg, args, bot) => {
		let member = resolveUser(msg, args.join(" "));
		if (args.length === 0) ({ member } = msg);
		if (!member) return await msg.channel.send("This user can't be found.");

		const status = {
			online: `User is online!`,
			idle: `User is idle, probably drinking a cup of tea`,
			offline: `User is offline, probably sleeping`,
			dnd: `User doesn't want to be disturbed right now`,
		};
		const game = member.presence.game ? member.presence.game.name : "Not playing a game";
		const createdAt = formatFromNow(member.user.createdAt, {
			addSuffix: true,
		});
		const joinedAt = formatFromNow(member.joinedAt, { addSuffix: true });
		let roles = "This user has no special roles";
		let size = 0;
		if (member.roles.cache.size !== 1) {
			// We don't use the @everyone role
			roles = member.roles.cache.filter(role => role.name !== "@everyone");
			({ size } = roles);
			if (roles.size !== 1) {
				roles = `${roles
					.array()
					.slice(0, -1)
					.map(r => r.name)
					.join(", ")} and ${roles.last().name}`;
			} else {
				roles = roles.first().name;
			}
		}

		const embed = new MessageEmbed()
			.setAuthor(member.user.tag, member.user.displayAvatarURL())
			.setThumbnail(member.user.displayAvatarURL())
			.setTitle(`Information about ${member.displayName}`)
			.setDescription(status[member.presence.status])
			.addField("Username", member.user.username, true)
			.addField(`Playing...`, game, true)
			.addField("Account created", createdAt, true)
			.addField("Joined the server", joinedAt, true)
			.addField("ID", member.id, true)
			.addField("Bot :robot:", member.user.bot ? "Bleep bloop, I am a bot" : "This person isn't a bot", true)
            .addField(`Roles [${size}]`, `\`${roles}\``)
            .setColor(member.displayHexColor === "#000000" ? "#FFFFFF" : member.displayHexColor)
		msg.channel.send(embed);
	},
};
