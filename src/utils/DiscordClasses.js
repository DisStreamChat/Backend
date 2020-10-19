const Discord = require("discord.js");
const DiscordOauth2 = require("discord-oauth2");
const fetch = require("node-fetch");

const oauth = new DiscordOauth2();

class DiscordServer {
	constructor(serverObject, user) {
		this.member = user.id;
		this.id = serverObject.id;
		this.name = serverObject.name;
		this.icon = serverObject.icon;
		this.owner = serverObject.owner;
		this.permissions = new Discord.Permissions(serverObject.permissions).toArray();
	}
}

class DiscordUser {
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

const getUserInfo = async tokenData => {
	const accessToken = tokenData.access_token;
	const refreshToken = tokenData.refresh_token;
	const user = await oauth.getUser(accessToken);
	const guilds = await oauth.getUserGuilds(accessToken);
	const userInfo = new DiscordUser(user, guilds, refreshToken);
	return userInfo;
};

module.exports = {
	DiscordServer,
	DiscordUser,
	getUserInfo,
};
