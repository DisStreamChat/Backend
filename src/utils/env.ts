import dotenv from "dotenv";
dotenv.config();

export interface EnvModel {
	BOT_TOKEN: string;
	TWITH_OAUTH_TOKEN: string;
	TWITCH_API_TOKEN: string;
	TWITCH_CLIENT_ID: string;
	TWITCH_REFRESH_TOKEN: string;
	TWITCH_ACCESS_TOKEN: string;
	TWITCH_APP_CLIENT_ID: string;
	CLIENT_SECRET: string;
	REDIRECT_URI: string;
	TWITCH_DEBUG: string;
	DEBUG_CHANNEL: string;
	DISCORD_CLIENT_SECRET: string;
	GOOGLE_CONFIG_BASE64: string;
	DISCORD_CLIENT_ID: string;
	WEBHOOK_SECRET: string;
	DSC_API_KEY: string;
	BOT_DEV: boolean;
	TOP_GG_TOKEN: string;
	PREMIUM_BOT_TOKEN: string;
	PREMIUM_BOT: boolean;
	PORT: number
}

export const config = {
	...process.env,
	PREMIUM_BOT: process.env.PREMIUM_BOT == "true",
	BOT_DEV: process.env.BOT_DEV == "true",
} as EnvModel;
