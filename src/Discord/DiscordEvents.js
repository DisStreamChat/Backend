// get functions used to do things like strip html and replace custom discord emojis with the url to the image
const { formatMessage } = require("../utils/messageManipulation");
const CommandHandler = require("./CommandHandler");
const ReactionRoles = require("./Reaction Manager")
// TODO: move to firebase db
const ranks = require("../ranks.json");

const { handleLeveling } = require("./Leveling");

const path = require("path")
const fs = require("fs")
const eventPath = path.join(__dirname, "./Events");
const eventFiles = fs.readdirSync(eventPath);
const events = {};

module.exports = (DiscordClient, io, app) => {
    ReactionRoles(DiscordClient)
    // TODO: move discord events to separate file
    eventFiles.forEach(event => {
        if (event.endsWith(".js")) {
            const eventHandler = require(path.join(eventPath, event));
            DiscordClient.on(event.slice(0, -3), eventHandler)
        }
    });

	DiscordClient.on("message", async message => {
        try{

            if (!message.guild) return;
    
            // handle commands and leveling, if they are enabled for the server
            if (!message.author.bot) {
                await handleLeveling(message);
            }
            if (/*(message.guild.id === "711238743213998091" || message.guild.id === "702522791018102855") &&*/ !message.author.bot) {
                // remove in the future to make it work on all guilds
                await CommandHandler(message, DiscordClient);
            }
    
            // after commands try to send message through the io, but only if there are io connected to the guild
            // if (!io.hasOwnProperty(message.guild.id)) return;
            // if (![...io[message.guild.id]].length) return;
    
            // const { liveChatId } = [...io[message.guild.id]][0].userInfo;
    
            // don't waste time with the rest of the stuff if there isn't a connection to this guild
            // if (message.channel.id != liveChatId && !liveChatId.includes(message.channel.id)) return;
    
            const senderName = message.member.displayName;
    
            const badges = {};
    
            // custom badges based on permissions or if the user is an admin
            if (message.member) {
                if (message.guild.ownerID == message.author.id) {
                    badges["broadcaster"] = {
                        image: "https://static-cdn.jtvnw.net/badges/v1/5527c58c-fb7d-422d-b71b-f309dcb85cc1/1",
                        title: "Server Owner",
                    };
                } else {
                    if (message.member.hasPermission(["MANAGE_MESSAGES"])) {
                        badges["moderator"] = {
                            image: "https://static-cdn.jtvnw.net/badges/v1/3267646d-33f0-4b17-b3df-f923a41db1d0/1",
                            title: "Moderator",
                        };
                    }
                }
    
                if (message.member.premiumSinceTimestamp) {
                    badges["booster"] = {
                        image: "https://cdn.discordapp.com/attachments/711241287134609480/727707559045365771/serverbooster.png",
                        title: "Server Booster",
                    };
                }
    
                if (ranks.discord.developers.includes(message.author.id)) {
                    badges["developer"] = {
                        image: "https://cdn.discordapp.com/attachments/699812263670055052/722630142987468900/icon_18x18.png",
                        title: "DisStreamchat Staff",
                    };
                }
            }
    
            if (message.author.bot) {
                badges["bot"] = {
                    image: "https://cdn.betterttv.net/tags/bot.png",
                    title: "Discord Bot",
                };
            }
    
            //Setting Override/Default Color (Webhooks aren't members, so we default to this)
            let userHexColor = "#FFFFFF";
    
            if (message.member) {
                userHexColor = message.member.displayHexColor === "#000000" ? userHexColor : message.member.displayHexColor;
            }
    
            try {
                const CleanMessage = message.cleanContent;
                const HTMLCleanMessage = await formatMessage(CleanMessage, "discord", {}, { HTMLClean: true });
    
                const messageObject = {
                    displayName: senderName,
                    username: message.author.username,
                    userId: message.author.id,
                    avatar: message.author.displayAvatarURL(),
                    body: HTMLCleanMessage,
                    platform: "discord",
                    messageId: "",
                    messageType: "chat",
                    uuid: message.id,
                    id: message.id,
                    badges,
                    sentAt: message.createdAt.getTime(),
                    userColor: userHexColor,
                };
    
                if (messageObject.body.length <= 0) return;
    
                io.in(`channel-${message.channel.id}`).emit("chatmessage", messageObject);
            } catch (err) {
                console.log(err.message);
            }
        }catch(err){
            console.log(`error is discord message: ${err.message}`)
            console.log(err);
        }
	});

	// TODO: add logging
	DiscordClient.on("messageDelete", message => {
		try {
			io.in(`channel-${message.channel.id}`).emit("deletemessage", message.id);
		} catch (err) {
			console.log(err.message);
		}
	});

	DiscordClient.on("messageDeleteBulk", message => {
		message.forEach(msg => {
			try {
                io.in(`guild-${msg.guild.id}`).emit("deletemessage", msg.id);
            } catch (err) {
                console.log(err.message);
            }
		});
	});

	// TODO: add logging
	DiscordClient.on("messageUpdate", async (oldMsg, newMsg) => {
		try {
			const HTMLCleanMessage = await formatMessage(newMsg.cleanContent, "discord", {}, { HTMLClean: true });
			const updateMessage = {
				body: HTMLCleanMessage,
				id: newMsg.id,
			};
			io.in(`channel-${newMsg.channel.id}`).emit("updateMessage", updateMessage);
		} catch (err) {
			console.log(err.message);
		}
	});

	// TODO: add in customizable welcome messages and logging
	DiscordClient.on("guildMemberAdd", async member => {
		if (member.guild.id === "711238743213998091") {
			await member.send(
				`Welcome to the DisStreamChat community. If you need help setting up DisStreamChat feel free to ask in any of the help channels. But try to find a help channel related to you problem. If you can't talk in any of the chats just DM a moderator and they will sort out the issue. Any suggestions or bug reports you have should go in the respective channels. 😀`
			);
		}
	});
};
