import { Channel, Client, Collection, Guild, GuildMember, MessageEmbed, User } from "discord.js";
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

class SlashCommandInteraction {
	arguments: Object<string>;

	channel: Channel;
	guild: Guild;
	member: GuildMember;
	user: User;
	id: string;
	token: string;
	name: string;
	constructor(interaction, public client: DiscordClient) {
		this.guild = this.client.guilds.resolve(interaction.guild_id);
		this.channel = this.guild.channels.resolve(interaction.channel_id);
		this.token = interaction.token;
		this.id = interaction.id;
		this.arguments = interaction.data.options?.reduce((acc, cur) => ({ ...acc, [cur.name]: cur.value }), {});
		this.name = interaction.data.name;
	}

	async reply(data) {
		if(data.embed) {
			data.embeds = [...(data.embeds || []), data.embed]
			delete data.embed
		}
		await this.client._api.interactions(this.id, this.token).callback.post({
			data: {
				type: 4,
				data,
			},
		});
	}
}

type slashCommandCallback = (interaction: SlashCommandInteraction) => Promise<void>;

export class DiscordClient extends Client {
	slashCommands: Object<slashCommandCallback>;

	constructor(options) {
		super(options);
		this.slashCommands = {};
	}

	get _api() {
		// @ts-ignore
		return this.api as any;
	}

	get application() {
		return this._api.applications(this.user.id);
	}

	getApp(guildId: string) {
		let app = this.application;
		if (guildId) {
			app = app.guilds(guildId);
		}
		return app;
	}

	async getSlashCommands(guildId: string) {
		return this.getApp(guildId).commands.get();
	}

	async registerSlashCommand(details: SlashCommandOptions, callback: slashCommandCallback) {
		const guilds = this.guilds.cache.array();
		for (const guild of guilds) {
			try {
				// const commands = await this.getSlashCommands(guild.id);
				await this.getApp(guild.id).commands.post(details);
				this.slashCommands[details.data.name] = callback;
			} catch (err) {
				log(err, { error: true, writeToConsole: true });
			}
		}
	}

	slashCommandHandler() {
		this.ws.on("INTERACTION_CREATE" as any, async interaction => {
			if (interaction.type !== 2) return;
			const interactionObject = new SlashCommandInteraction(interaction, this);

			this.slashCommands[interactionObject.name](interactionObject);
			// if (command === "ping") {
			// 	let pingembed = new MessageEmbed()
			// 		.setTitle(`🏓 Pong!`)
			// 		.addFields({ name: `${this.user.username}'s Ping:`, value: `${Math.round(this.ws.ping)}ms` });
			// }
		});
	}
}
