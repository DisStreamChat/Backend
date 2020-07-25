const formatDistanceToNow = require('date-fns/formatDistanceToNow');
const { MessageEmbed} = require("discord.js")
const fs = require("fs")
const path = require("path")
const adminIds = require("../ranks.json")

const walkSync = (files, fileDir, fileList = []) => {
    for (const file of files) {
        const absolutePath = path.join(fileDir, file);
        if (fs.statSync(absolutePath).isDirectory()) {
            const dir = fs.readdirSync(absolutePath);
            walkSync(dir, absolutePath, fileList);
        } else {
            fileList.push(path.relative(__dirname, absolutePath));
        }
    }
    return fileList;
} 

const ArrayAny = (arr1, arr2) => arr1.some(v => arr2.indexOf(v) >= 0)

const hasPermsission = (member, perms) => ArrayAny(member.permissions.toArray(), perms)

const modWare = async (msg, args, client, permissions, cb) => {
    if (hasPermsission(msg.member, permissions)) {
        await cb(msg, args, client)
    } else {
        await msg.channel.send("❌ you don't have permission to use this command")
    }
}

const resolveUser = (msg, username) => {
    const memberCache = msg.guild.members.cache;
    if (/<@!?\d+>/g.test(username)) {
        return memberCache.get(msg.mentions.users.first().id);
    }
    if (memberCache.has(username)) {
        return memberCache.get(username);
    }
    if (/(.*)#(\d{4})/g.test(username)) {
        return memberCache.find(member => member.user.tag === username);
    }
    if (memberCache.find(member => member.nickname === username)) {
        return memberCache.find(member => member.nickname === username);
    }
    if (memberCache.find(member => member.user.username === username)) {
        return memberCache.find(member => member.user.username === username);
    }
    if (memberCache.find(member => member.id === username)) {
        return memberCache.find(member => member.id === username);
    }
    return null;
};

const adminWare = async (message, args, client, cb) => {
    const discordAdmins = adminIds.discord.developers
    if(discordAdmins.includes(message.author.id)){
        await cb(message, args, client)
    }else{
        await message.channel.send("❌ you don't have permission to use this command")
    }

}

class Command {
    constructor(func, description, usage, category, perms) {
        if (!perms || perms.length === 0) {
            this.perms = []
            this.isMod = false
            this.execute = func
        } else {
            this.perms = perms
            this.isMod = true
            this.execute = (msg, args, client, config) => modWare(msg, args, client, config, func)
        }
        this.helptext = {
            description,
            usage,
            category
        }
    }
}

const embedJSON = (obj, title="") => {
    const embed = new MessageEmbed()
        .setTitle(title)
        .setFooter("JSON embedded")
    for(const key of Object.keys(obj)){
        const value = obj[key]
        if(value instanceof Array){
            embed.addField(key, value.join("\n"))
        }else{
            embed.addField(key, value)
        }
    }
}

module.exports = {
    isNumeric: (value) => {
        return /^-?\d+[.\,]?\d*$/.test(value);
    },
    
    randomChoice: (arr) => {
        return arr[Math.floor(arr.length * Math.random())];
    },

    formatFromNow: (time) => formatDistanceToNow(time, { addSuffix: true }),
    randomString: len => [...Array(len)].map(i => (~~(Math.random() * 36)).toString(36)).join(''),

    capitalize: s => s.charAt(0).toUpperCase() + s.slice(1),
    ArrayAny,
    hasPermsission,
    walkSync,
    Command,
    modWare,
    adminWare,
    resolveUser
}