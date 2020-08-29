import admin from "firebase-admin";
import { MessageEmbed } from "discord.js";

module.exports = async (channel, client) => {
    const guild = channel.guild;

    let channelId = null;
    const serverRef = await admin.firestore().collection("loggingChannel").doc(guild.id).get();
    const serverData = serverRef.data();
    if (serverData) {
        channelId = serverData.server;
    }

    let parentCheck = '';
    if (channel.parentID) {
        parentCheck = `(Parent ID: ${channel.parentID})`
    }

    const embed = new MessageEmbed()
        //.setAuthor(member.user.tag, member.user.displayAvatarURL())
        //.setThumbnail(member.user.displayAvatarURL())
        .setDescription(`:inbox_tray: ${channel.name} **channel created**`)
        .setFooter(`ID: ${channel.id} ${parentCheck}`)
        .setTimestamp(new Date())
        .setColor("#11ee11");

    if (!channelId) return;
    const channel = guild.channels.resolve(channelId);

    channel.send(embed);
};