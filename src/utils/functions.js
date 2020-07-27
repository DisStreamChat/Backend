const formatDistanceToNow = require('date-fns/formatDistanceToNow');
const { MessageEmbed, MessageAttachment} = require("discord.js")
const fs = require("fs")
const path = require("path")
const adminIds = require("../ranks.json")
const { createCanvas, loadImage, registerFont } = require("canvas");

const getLevel = xp => Math.max(0, Math.floor(Math.log(xp - 100)));

const getXp = level => 5 / 6 * level * (2 * level * level + 27 * level + 91);

const applyText = (canvas, text) => {
	const ctx = canvas.getContext("2d");

	// Declare a base size of the font
	let fontSize = 70;

	do {
		// Assign the font to the context and decrement it so it can be measured again
		ctx.font = `${(fontSize -= 10)}px sans-serif`;
		// Compare pixel width of the text to the canvas minus the approximate avatar size
	} while (ctx.measureText(text).width > canvas.width - 300);

	// Return the result to use in the actual canvas
	return ctx.font;
};

const roundRect = function (ctx, x, y, w, h, r = 0) {
	if (w < 2 * r) r = w / 2;
	if (h < 2 * r) r = h / 2;
	ctx.beginPath();
	ctx.moveTo(x + r, y);
	ctx.arcTo(x + w, y, x + w, y + h, r);
	ctx.arcTo(x + w, y + h, x, y + h, r);
	ctx.arcTo(x, y + h, x, y, r);
	ctx.arcTo(x, y, x + w, y, r);
	ctx.fill();
	return ctx;
};

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

const cleanRegex = function (str) {
	return str.replace(/([.?*+^$[\]\\(){}|-])/g, "\\$1");
};

const ArrayAny = (arr1, arr2) => arr1.some(v => arr2.indexOf(v) >= 0)

const hasPermsission = (member, perms) => ArrayAny(member.permissions.toArray(), perms)

const modWare = async (msg, args, client, permissions, cb, {twitch} = {}) => {
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

const generateRankCard = async (userData, user) => {
    const canvas = createCanvas(700, 250);
    const ctx = canvas.getContext("2d");
    const xpToNextLevel = getXp(userData.level + 1);
    const currentXp = userData.xp;
    const percentDone = currentXp / xpToNextLevel;
    ctx.fillStyle = "#090b0b";
    roundRect(ctx, 0, 0, canvas.width, canvas.height, 125);

    const barWidth = canvas.width / 1.9;
    const barHeight = 25;

    ctx.fillStyle = "#484b4e";
    roundRect(ctx, canvas.width / 2.75, 185, barWidth, barHeight, barHeight / 2);
    ctx.fillStyle = "#c31503";
    roundRect(ctx, canvas.width / 2.75, 185, barWidth * percentDone, barHeight, barHeight / 2);

    ctx.font = "28px Poppins";

    ctx.fillStyle = "#ffffff";
    ctx.fillText(`${user.user.tag}`, canvas.width / 2.75, 170);
    ctx.font = "20px Poppins";
    const displayXp = userData.xp > 1000 ? `${(userData.xp / 1000).toFixed(2)}k` : userData.xp;
    const displayXpToGo = xpToNextLevel > 1000 ? `${(xpToNextLevel / 1000).toFixed(2)}k` : xpToNextLevel;
    const xpText = `${displayXp}/${displayXpToGo} XP`;
    const xpTextWidth = ctx.measureText(xpText).width;
    ctx.fillStyle = "#dddddd";
    ctx.fillText(xpText, canvas.width - xpTextWidth - 80, 170);
    ctx.fillStyle = "#ffffff";
    ctx.font = "42px Poppins";
    const levelText = `Level ${userData.level}`;
    const levelTextWidth = ctx.measureText(levelText).width;
    ctx.fillText(levelText, canvas.width - levelTextWidth - 80, 50);

    ctx.fillStyle = "#000000";
    ctx.beginPath();
    ctx.arc(125, 125, 100, 0, Math.PI * 2, true);
    ctx.fill();
    ctx.clip();
    const profileUrl = user.user.displayAvatarURL({ format: "png" });
    const avatar = await loadImage(profileUrl);
    ctx.drawImage(avatar, 25, 25, 200, 200);
    return canvas
    

}

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
    resolveUser,
    Random: (min, max) => {
        if(!max && min){
            return this.Random(0, min)
        }
        return Math.random() * (max - min) + min;
    },
    generateRankCard,
    getLevel,
    getXp,
    roundRect,
    applyText
}