import admin from "firebase-admin";
import { MessageEmbed } from "discord.js";
import setupLogging from "./utils/setupLogging";

module.exports = async (oldEmoji, newEmoji) => {
    const guild = newEmoji.guild;

    const [channelId, active] = setupLogging(guild, "channelUpdate")
    if(!active) return

    if (!channelId) return;

    // console.log(oldEmoji, newEmoji)
};