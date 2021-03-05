//@ts-ignore
import * as functions from "firebase-functions";
import * as discord from "discord.js";
import * as admin from "firebase-admin";

admin.initializeApp();

const DiscordClient = new discord.Client({ partials: ["MESSAGE", "CHANNEL", "REACTION"] });

const runBot = async (callback: (client: discord.Client) => Promise<void>) => {
	DiscordClient.once("ready", async () => {
		await callback(DiscordClient);
		DiscordClient.destroy();
	});
	
	await DiscordClient.login(functions.config().discord.token);
};
// Start writing Firebase Functions
// https://firebase.google.com/docs/functions/typescript
//@ts-ignore
export const helloWorld = functions.https.onRequest(async (_request, response) => {
	await runBot(async client => {
		const guild = await client.guilds.fetch("809234741018361916");
		const channel = guild.channels.resolve("809234742482305087") as discord.TextChannel;
		if (!channel) return;
		await channel.send("hello world");
	});
	response.json({ message: "hello world", token: functions.config().discord.token });
});
