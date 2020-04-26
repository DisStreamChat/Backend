const app = require('express')();
const http = require('http').createServer(app);
const io = require('socket.io')(http);
const discord = require("discord.js")
const tmi = require("tmi.js")
require("dotenv").config()
require("./api")
const fs = require("fs")
const path = require("path")

const AntiSpam = require('discord-anti-spam');
const antiSpam = new AntiSpam({
    warnThreshold: 3, // Amount of messages sent in a row that will cause a warning.
    kickThreshold: 7, // Amount of messages sent in a row that will cause a ban.
    banThreshold: 15, // Amount of messages sent in a row that will cause a ban.
    maxInterval: 2000, // Amount of time (in milliseconds) in which messages are considered spam.
    warnMessage: '{@user}, Please stop spamming.', // Message that will be sent in chat upon warning a user.
    kickMessage: '**{user_tag}** has been kicked for spamming.', // Message that will be sent in chat upon kicking a user.
    banMessage: '**{user_tag}** has been banned for spamming.', // Message that will be sent in chat upon banning a user.
    maxDuplicatesWarning: 2, // Amount of duplicate messages that trigger a warning.
    maxDuplicatesKick: 10, // Amount of duplicate messages that trigger a kick.
    maxDuplicatesBan: 12, // Amount of duplicate messages that trigger a ban.
    exemptPermissions: ['ADMINISTRATOR', "MANAGE SERVER"], // Bypass users with any of these permissions.
    ignoreBots: true, // Ignore bot messages.
    verbose: true, // Extended Logs from module.
    ignoredUsers: [], // Array of User IDs that get ignored.
});

const sockets = {}

const configFile = require("../config.json")

const DiscordClient = new discord.Client({ partials: ['MESSAGE', 'CHANNEL', 'REACTION'] })


const allChannels = (Object.entries(configFile.channels).map(([id, info]) => info.twitch.slice(1)))


const Twitchclient = new tmi.Client({
    options: { debug: true },
    connection: {
        secure: true,
        reconnect: true
    },
    identity: {
        username: 'distwitchchat', 
        password: process.env.TWITH_OAUTH_TOKEN
    },
    channels: allChannels
});

// Twitchclient.connect();

// TODO add uptime command to twitch side of bot

DiscordClient.once("ready", async () => {
    console.log("bot ready")
    DiscordClient.user.setPresence({ status: "online", activity: { type: "WATCHING", name: "Live Chat" } })
})

DiscordClient.login(process.env.BOT_TOKEN) 

const urlRegex = /^(http:\/\/www\.|https:\/\/www\.|http:\/\/|https:\/\/)?[a-z0-9]+([\-\.]{1}[a-z0-9]+)*\.[a-z]{2,5}(:[0-9]{1,5})?(\/.*)?$/gm
const customEmojiRegex = /<(:[\w]+:)([\d]+)>/gm
const channelMentionRegex = /<#(\d+)>/gm
const mentionRegex = /<@([\W\S])([\d]+)>/gm

const replaceMentions = async msg => {
    const guild = msg.guild
    const {members, roles} = guild
    const mentions = [...msg.content.matchAll(mentionRegex)].map(match => ({prefix: match[1], id: match[2]}))
    for (const {prefix, id} of mentions){
        if(prefix === "!"){
            const username = (await members.fetch(id)).user.username
            msg.content = msg.content.replace(new RegExp(`<@${prefix}${id}>`, "g"), "@"+username)
        }else if(prefix === "&"){
            const name = (await roles.fetch(id)).name
            msg.content = msg.content.replace(new RegExp(`<@${prefix}${id}>`, "g"), "@"+name)
        }
    }
    return msg
}

const replaceChannelMentions = async msg => {
    const guild = msg.guild
    const { channels } = guild
    const mentions = [...msg.content.matchAll(channelMentionRegex)].map(match => match[1])
    for (const id of mentions){
        const name = (await channels.resolve(id)).name
        msg.content = msg.content.replace(new RegExp(`<#${id}>`, "g"), "#" + name)
    }
    return msg
}


DiscordClient.on("message", async msg => {
    if(msg.author.bot) return

    const senderName = msg.member.displayName
    const guildConfig = configFile.channels[msg.guild.id]
    try{
        if(guildConfig === undefined){
            return await msg.channel.send("It apears your server has not yet been configured, if you have the `Manage server` permission you can configure it at `website` ")
        }

        // msg = await replaceMentions(msg)
        // msg = await replaceChannelMentions(msg)

        const messageBody = msg.cleanContent.replace(customEmojiRegex, "$1")

        if (msg.channel.id === guildConfig.livechatId && messageBody.length > 0){
            antiSpam.message(msg)

            const msgObject = {
                displayName: senderName,
                avatar: msg.author.displayAvatarURL(),
                body: messageBody,
                platform: "discord"
            }

            console.log(msgObject)

            // await Twitchclient.say(guildConfig.twitch, `${messageBody}`);
            if(sockets.hasOwnProperty(msg.guild.id)){
                sockets[msg.guild.id].emit("discordmessage", msgObject)
            }
        }
    }catch(err){
        console.log(err)
    }
})

io.on('connection', (socket) => {

    // TODO have socket receive message from frontend giving it the discord guildID, also convert sockets from a set to an object
    socket.on("addme", msg => {
        socket.guildId = msg.guildId
        sockets[msg.guildId] = socket;
    })
    console.log('a user connected');
    socket.on("disconnect", () => {
        console.log('a user disconnected');
        sockets[socket.guildId] = null
    });
});


http.listen(3200, () => {
    console.log('listening on *:3200');
});