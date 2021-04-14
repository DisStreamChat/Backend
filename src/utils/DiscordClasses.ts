const Discord = require("discord.js");
const DiscordOauth2 = require("discord-oauth2");
const fetch = require("node-fetch");
import { DiscordClient } from "../utils/initClients";
const oauth = new DiscordOauth2();

export class DiscordServer {
	member: string
	id: string
	name:string
	icon: string
	owner: string
	permissions: string
	roles: any[]
	constructor(serverObject, user) {
		this.member = user.id;
		this.id = serverObject.id;
		this.name = serverObject.name;
		this.icon = serverObject.icon;
		this.owner = serverObject.owner;
		this.permissions = new Discord.Permissions(serverObject.permissions).toArray();

		try {
			const guild = DiscordClient.guilds.resolve(this.id);
			this.roles = guild.members
				.resolve(this.member)
				?.roles?.cache?.array()
				?.map(role => role.id);
		} catch (err) {
			this.roles = [];
		}
		console.log(this.roles);
	}
}

export class DiscordUser {

	refreshToken: string
	name: string
	id: string
	avatar: string
	profilePicture: string
	MFA: boolean
	guilds: any[]

	constructor(userObject, servers, refreshToken) {
		this.refreshToken = refreshToken;
		this.name = userObject.username;
		this.id = userObject.id;
		this.avatar = userObject.avatar;
		this.profilePicture =
			userObject?.displayAvatarUrl?.({ format: "png" }) || `https://cdn.discordapp.com/avatars/${this.id}/${userObject.avatar}.png`;
		this.MFA = userObject.mfa_enabled;
		this.guilds = servers.map(server => new DiscordServer(server, userObject));
	}
}

export const getUserInfo = async tokenData => {
	const accessToken = tokenData.access_token;
	const refreshToken = tokenData.refresh_token;
	const user = await oauth.getUser(accessToken);
	const guilds = await oauth.getUserGuilds(accessToken);
	const userInfo = new DiscordUser(user, guilds, refreshToken);
	return userInfo;
};

export default {
	DiscordServer,
	DiscordUser,
	getUserInfo,
};
