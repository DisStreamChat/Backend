import { resolveUser, formatFromNow } from "../../../utils/functions";
import { MessageEmbed, Collection } from "discord.js";

export default {
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

		const createdAt = formatFromNow(member.user.createdAt);

		const joinedAt = formatFromNow(member.joinedAt);
		let roles: string | Collection<string, any> = "This user has no roles";
		let size = 0;

		if (member.roles.cache.size !== 1) {
			// don't show the @everyone role
			roles = member.roles.cache.filter(role => role.name !== "@everyone") as Collection<string, any>;
			({ size } = roles);
			if (roles.size !== 1) {
				roles = `${roles
					// @ts-ignore
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
			.addField("Username", member.user.username, true)
			.addField("Account created", createdAt, true)
			.addField("Joined the server", joinedAt, true)
			.addField(`Roles - ${size}`, `${roles}`)
			.setColor(member.displayHexColor === "#000000" ? "#FFFFFF" : member.displayHexColor)
			.setFooter(`ID: ${member.id}`)
			.setTimestamp(new Date());
		msg.channel.send(embed);
	},
};
