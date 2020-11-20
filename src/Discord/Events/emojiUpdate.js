import admin from "firebase-admin";
import { MessageEmbed } from "discord.js";
import setupLogging from "./utils/setupLogging";

module.exports = async (oldEmoji, newEmoji, client) => {
    const guild = newEmoji.guild;

    const [channelId, active] = setupLogging(guild, "emojiUpdate", client)
    if(!active) return

    if (!channelId) return;

    // console.log(oldEmoji, newEmoji)
};