const formatDistanceToNow = require('date-fns/formatDistanceToNow');
const { MessageEmbed} = require("discord.js")
const fs = require("fs")
const path = require("path")

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

const modWare = async (msg, args, client, config, cb) => {
    if (hasPermsission(msg.member, client.config[msg.guild.id].modPerms)) {
        await cb(msg, args, client, config)
    } else {
        await msg.channel.send("you don't have permission to use this command")
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

// checkCodingGame

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
    modWare
}