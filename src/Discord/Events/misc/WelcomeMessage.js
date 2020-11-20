import admin from "firebase-admin";
const { formatFromNow } = require("../../../utils/functions");
import { MessageEmbed } from "discord.js";
import generateView from "../../Commands/CustomCommands/GenerateView";
import Mustache from "mustache"

Mustache.tags = ["{", "}"];

module.exports = async (guild, member) => {
	const settings = await admin.firestore().collection("DiscordSettings").doc(guild.id).get();
	const data = settings.data();
	if (!data) return;
	if (!data.activePlugins["welcome-message"]) return;
	if (!data.welcomeMessage) return;
    const view = generateView({ message: { member: member, author: member }, args: [] });
    const message = Mustache.render(data.welcomeMessage.message, view).replace(/&lt;/gim, "<").replace(/&gt;/gim, ">") 
    const channelId = data.welcomeMessage.channel
    if(!channelId) return
    const welcomeChannel = guild.channels.resolve(channelId);

    // TODO: add welcome card functionality

	welcomeChannel.send(message);
};
