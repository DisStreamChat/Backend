interface EnvironmentVariables {
	DISCORD_BOT_TOKEN: string;
	TWITH_OAUTH_TOKEN: string;
	TWITCH_API_TOKEN: string;
	TWITCH_CLIENT_ID: string;
	TWITCH_ACCESS_TOKEN: string;
	TWITCH_APP_CLIENT_ID: string;
	TWITCH_CLIENT_SECRET: string;
	TWITCH_OAUTH_REDIRECT_URI: string;
	TWITCH_DEBUG_MODE: boolean;
	DEBUG_TWITCH_CHANNEL: string;
	GOOGLE_SERVICE_ACCOUNT_BASE64: string;
	DISCORD_CLIENT_ID: string;
	DISCORD_CLIENT_SECRET: string;
	TWITCH_WEBHOOK_SECRET: string;
	DSC_API_KEY: string;
	BOT_DEV: boolean;
	PORT: number;
}

class EnvManager {
	private static getEnvVar<T = string>(
		key: keyof EnvironmentVariables,
		defaultValue?: T
	): string | T {
		return process.env[key] || defaultValue;
	}

	private static convertToBoolean(value: string): boolean {
		return value.toLowerCase() === "true";
	}

	private static convertToNumber(value: string | number): number {
		return Number(value);
	}

	public static getEnvironmentVariables(): EnvironmentVariables {
		return {
			DISCORD_BOT_TOKEN: this.getEnvVar("DISCORD_BOT_TOKEN"),
			TWITH_OAUTH_TOKEN: this.getEnvVar("TWITH_OAUTH_TOKEN"),
			TWITCH_API_TOKEN: this.getEnvVar("TWITCH_API_TOKEN"),
			TWITCH_CLIENT_ID: this.getEnvVar("TWITCH_CLIENT_ID"),
			TWITCH_ACCESS_TOKEN: this.getEnvVar("TWITCH_ACCESS_TOKEN"),
			TWITCH_APP_CLIENT_ID: this.getEnvVar("TWITCH_APP_CLIENT_ID"),
			TWITCH_CLIENT_SECRET: this.getEnvVar("TWITCH_CLIENT_SECRET"),
			TWITCH_OAUTH_REDIRECT_URI: this.getEnvVar("TWITCH_OAUTH_REDIRECT_URI"),
			TWITCH_DEBUG_MODE: this.convertToBoolean(this.getEnvVar("TWITCH_DEBUG_MODE")),
			DEBUG_TWITCH_CHANNEL: this.getEnvVar("DEBUG_TWITCH_CHANNEL"),
			GOOGLE_SERVICE_ACCOUNT_BASE64: this.getEnvVar("GOOGLE_SERVICE_ACCOUNT_BASE64"),
			DISCORD_CLIENT_ID: this.getEnvVar("DISCORD_CLIENT_ID"),
			DISCORD_CLIENT_SECRET: this.getEnvVar("DISCORD_CLIENT_SECRET"),
			TWITCH_WEBHOOK_SECRET: this.getEnvVar("TWITCH_WEBHOOK_SECRET"),
			DSC_API_KEY: this.getEnvVar("DSC_API_KEY"),
			BOT_DEV: this.convertToBoolean(this.getEnvVar("BOT_DEV")),
			PORT: this.convertToNumber(this.getEnvVar("PORT", 3200)),
		};
	}

	public static get DISCORD_BOT_TOKEN(): string {
		return this.getEnvVar("DISCORD_BOT_TOKEN");
	}

	public static get TWITH_OAUTH_TOKEN(): string {
		return this.getEnvVar("TWITH_OAUTH_TOKEN");
	}

	public static get TWITCH_API_TOKEN(): string {
		return this.getEnvVar("TWITCH_API_TOKEN");
	}

	public static get TWITCH_CLIENT_ID(): string {
		return this.getEnvVar("TWITCH_CLIENT_ID");
	}

	public static get TWITCH_DEBUG_MODE(): boolean {
		return this.convertToBoolean(this.getEnvVar("TWITCH_DEBUG_MODE"));
	}

	public static get BOT_DEV(): boolean {
		return this.convertToBoolean(this.getEnvVar("BOT_DEV"));
	}

	public static get GOOGLE_SERVICE_ACCOUNT_BASE64(): string {
		return this.getEnvVar("GOOGLE_SERVICE_ACCOUNT_BASE64");
	}

	public static get GOOGLE_SERVICE_ACCOUNT_JSON(): Record<string, string> {
		return JSON.parse(
			Buffer.from(this.GOOGLE_SERVICE_ACCOUNT_BASE64, "base64").toString("ascii")
		);
	}

	public static get TWITCH_ACCESS_TOKEN(): string {
		return this.getEnvVar("TWITCH_ACCESS_TOKEN");
	}

	public static get TWITCH_APP_CLIENT_ID(): string {
		return this.getEnvVar("TWITCH_APP_CLIENT_ID");
	}

	public static get TWITCH_CLIENT_SECRET(): string {
		return this.getEnvVar("TWITCH_CLIENT_SECRET");
	}

	public static get TWITCH_OAUTH_REDIRECT_URI(): string {
		return this.getEnvVar("TWITCH_OAUTH_REDIRECT_URI");
	}

	public static get DEBUG_TWITCH_CHANNEL(): string {
		return this.getEnvVar("DEBUG_TWITCH_CHANNEL");
	}

	public static get DISCORD_CLIENT_ID(): string {
		return this.getEnvVar("DISCORD_CLIENT_ID");
	}

	public static get DISCORD_CLIENT_SECRET(): string {
		return this.getEnvVar("DISCORD_CLIENT_SECRET");
	}

	public static get TWITCH_WEBHOOK_SECRET(): string {
		return this.getEnvVar("TWITCH_WEBHOOK_SECRET");
	}

	public static get DSC_API_KEY(): string {
		return this.getEnvVar("DSC_API_KEY");
	}

	public static get PORT(): number {
		return this.convertToNumber(this.getEnvVar("PORT", 3200));
	}
}

export { EnvironmentVariables, EnvManager };
