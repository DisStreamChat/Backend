import { Client, Collection, MessageEmbed } from "discord.js";
import { client } from "tmi.js";
import { Object } from "../models/shared.model";
import { log } from "../utils/functions/logging";
import DiscordButtons from "discord-buttons";
import { resolveUser, formatFromNow } from "../utils/functions";

interface SlashCommandOptions {
	data: {
		name: string;
		description: string;
		options?: any[];
	};
}

export class DiscordClient extends Client {
	constructor(options) {
		super(options);
	}

	get _api() {
		// @ts-ignore
		return this.api;
	}

	get application() {
		//@ts-ignore
		return this._api.applications(this.user.id);
	}

	getApp(guildId: string) {
		let app = this.application;
		if (guildId) {
			app = app.guilds(guildId);
		}
		return app;
	}

	async reply(id: string, token: string, response: { data: Object<any> }) {
		response.data.type = 4;
		console.log(response);
		//@ts-ignore
		this._api.interactions(id, token).callback.post(response);
	}

	async getSlashCommands(guildId: string) {
		return this.getApp(guildId).commands.get();
	}

	async registerSlashCommand(details: SlashCommandOptions) {
		const guilds = this.guilds.cache.array();
		for (const guild of guilds) {
			try {
				const commands = await this.getSlashCommands(guild.id);
				// if (commands.find(({ name }) => name === details.data.name)) continue;

				await this.getApp(guild.id).commands.post(details);
			} catch (err) {
				log(err, { error: true });
			}
		}
	}

	slashCommandHandler() {
		this.ws.on("INTERACTION_CREATE" as any, async interaction => {
			if (interaction.type !== 2) return;
			const command = interaction.data.name.toLowerCase();
			const options = interaction.data.options;
			console.log(interaction);
			if (command === "whois") {
				const guild = await this.guilds.fetch(interaction.guild_id);
				let member = await resolveUser(null as any, options[0].value, guild);

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

				this.reply(interaction.id, interaction.token, { data: { type: 4, data: { embeds: [embed] } } });
			}
			if (command === "ping") {
				let pingembed = new MessageEmbed()
					.setTitle(`🏓 Pong!`)
					.addFields({ name: `${this.user.username}'s Ping:`, value: `${Math.round(this.ws.ping)}ms` });
				await this.reply(interaction.id, interaction.token, {
					data: {
						type: 4,
						flags: 64,
						data: {
							embeds: [pingembed],
						},
					},
				});
			}
		});
	}
}
