const { resolveUser, formatFromNow } = require("../../../utils/functions");
const { MessageEmbed } = require("discord.js");

module.exports = {
	name: "userinfo",
	aliases: ["info", "whois"],
	id: "userinfo",
	category: "info",
	description: "Get a users info.",
	usage: ["(username | nickname | ping | id)"],
	execute: async (msg, args, bot) => {
		let member = await resolveUser(msg, args.join(" "));
		if (args.length === 0) ({ member } = msg);
		if (!member) return await msg.channel.send("This user can't be found.");

		const status = {
			online: `:green_circle: User is online!`,
			idle: `:yellow_circle: User is idle`,
			offline: `:black_circle: User is offline`,
			dnd: `:red_circle: User doesn't want to be disturbed right now`,
        };
        
		const game = member.presence.game ? member.presence.game.name : "Not playing a game";
        
        const createdAt = formatFromNow(member.user.createdAt, {
			addSuffix: true,
        });
        
		const joinedAt = formatFromNow(member.joinedAt, { addSuffix: true });
		let roles = "This user has no roles";
        let size = 0;
        
		if (member.roles.cache.size !== 1) {
			// don't show the @everyone role
			roles = member.roles.cache.filter(role => role.name !== "@everyone");
			({ size } = roles);
			if (roles.size !== 1) {
				roles = `${roles
					.array()
					.slice(0, -1)
					.map(r => r)
					.join(", ")} and ${roles.last()}`;
			} else {
				roles = roles.first();
			}
		}

		const embed = new MessageEmbed()
			.setAuthor(member.displayName, member.user.displayAvatarURL())
			.setThumbnail(member.user.displayAvatarURL())
			.setTitle(`Information about ${member.displayName}`)
			.setDescription(status[member.presence.status])
			.addField("Username", member.user.username, true)
			.addField(`Playing`, game, true)
			.addField("Account created", createdAt, true)
			.addField("Joined the server", joinedAt, true)
            .addField(`Roles - ${size}`, `${roles}`)
            .setColor(member.displayHexColor === "#000000" ? "#FFFFFF" : member.displayHexColor)
            .setFooter(`ID: ${member.id}`)
            .setTimestamp(new Date())
		msg.channel.send(embed);
	},
};
