const express = require("express")
const router = express.Router()
const sha1 = require('sha1');
const fetch = require("node-fetch")
const TwitchApi = require('twitch-lib')
const admin = require('firebase-admin');
const DiscordOauth2 = require("discord-oauth2");
const { getUserInfo} = require("../utils/DiscordClasses")
const {DiscordClient} = require("../utils/initClients")
const Discord = require("discord.js")
// get the serviceAccount details from the base64 string stored in environment variables
const serviceAccount = JSON.parse(Buffer.from(process.env.GOOGLE_CONFIG_BASE64, "base64").toString("ascii"))

// initialze the firebase admin api, this is used for generating a custom token for twitch auth with firebase
admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
})

// intialize the twitch api class from the twitch-lib package
const Api = new TwitchApi({
    clientId: process.env.TWITCH_CLIENT_ID,
    authorizationToken: process.env.TWITCH_ACCESS_TOKEN
})

const oauth = new DiscordOauth2({
    clientId: process.env.DISCORD_CLIENT_ID,
    clientSecret: process.env.DISCORD_CLIENT_SECRET,
    redirectUri: process.env.REDIRECT_URI + "/?discord=true",
});

// render the index.html file in the public folder when the /oauth/twitch endpoint is requested
router.use("/oauth/twitch", express.static("public"))

// default endpoint
router.get('/', (req, res) => {
    res.json({
        message: '📺 DisTwitchChat API 📺',
    });
});

router.get("/makecoffee", (req, res) => {
    res.status(418).json({
        status: 418,
        message: "I'm a Teapot ☕"
    })
})

router.get("/ismember", (req, res, next) => {
    res.json({result: !!DiscordClient.guilds.resolve(req.query.guild)})
})

router.get("/getchannels", async (req, res, next) => {
    try{
        const id = req.query.guild
        const selectedGuild = await DiscordClient.guilds.resolve(id)
        const channelManger = selectedGuild.channels
        res.json(channelManger.cache.array().filter(channel => channel.type == "text").map(channel => {
            const parent = channel.parent ? channel.parent.name : ""
            return { id: channel.id, name: channel.name, parent: parent }
        }))
    }catch(err){
        console.log(err)
        res.json([])
    }
})

router.get("/resolvechannel", async (req, res, next) => {
    const {guild, channel} = req.query
    const response = await fetch("https://api.distwitchchat.com/getchannels?guild="+guild)
    const json = await response.json()
    res.json(json.filter(ch => ch.id == channel)[0])
})

// redirect to the invite page for the bot you can specify a guild if you want
router.get("/invite", (req, res) => {
    const guildId = req.query.guild
    const inviteURL = "https://discord.com/api/oauth2/authorize?client_id=702929032601403482&permissions=8&redirect_uri=https%3A%2F%2Fwww.distwitchchat.com%2F%3Fdiscord%3Dtrue&scope=bot"
    if(guildId){
        res.redirect(`${inviteURL}&guild_id=${guildId}`)
    }else{
        res.redirect(inviteURL)
    }
})

// get invite link to our discord
router.get("/discord", (req, res) => {
    res.redirect("https://discord.gg/sFpMKVX")
})

// TODO: add download page
router.get("/app", (req, res) => {
    const version = req.query.v
    if(version){
        res.redirect(`https://github.com/DisTwitchChat/App/releases/download/v${version}/distwitchchat-Setup-${version}.exe`)
    }else{
        res.redirect(`https://firebasestorage.googleapis.com/v0/b/distwitchchat-db.appspot.com/o/distwitchchat%20Setup%201.0.2.exe?alt=media&token=4e928f5e-079a-47ab-b82b-3dba3101038c`)
    }
})

router.get("/discord/token/refresh", async (req, res, next) => {
    try{
        const token = req.query.token
        const tokenData = await oauth.tokenRequest({
            refreshToken: token,
            scope: "identify guilds",
            grantType: "refresh_token",
        })
        res.json(await getUserInfo(tokenData))
    }catch(err){
        next(err)
    }  
})

router.get("/discord/token", async (req, res, next) => {
    try{
        console.log(process.env.REDIRECT_URI + "/?discord=true")
        const code = req.query.code
        if(!code){
            return res.status(401).json({
                status: 401,
                message: "Missing Auth Token"
            })
        }
        const tokenData = await oauth.tokenRequest({
            code: code,
            scope: "identify guilds",
            grantType: "authorization_code",
        })
        res.json(await getUserInfo(tokenData))
    }catch(err){
        // res.send
        next(err)
    }
})

router.get("/profilepicture", async (req, res, next) => {
    try{
        const user = req.query.user
        const profilePicture = (await Api.getUserInfo(user))["profile_image_url"]
        res.json(profilePicture)
    }catch(err){
        next(err)
    }
})

router.get("/modchannels", async (req, res, next) => {
    try{
        const user = req.query.user
        const modChannels = await Api.getUserModerationChannels(user)
        res.json(modChannels)
    }catch(err){
        next(err)
    }

    
})


router.get("/token", async (req, res, next) => {
    try {
        const code = req.query.code
        const apiURL = `https://id.twitch.tv/oauth2/token?client_id=${process.env.TWITCH_APP_CLIENT_ID}&client_secret=${process.env.CLIENT_SECRET}&code=${code}&grant_type=authorization_code&redirect_uri=${process.env.REDIRECT_URI}`
        const response = await fetch(apiURL, {
            method: "POST"
        })
        const json = await response.json()
        const validationResponse = await fetch("https://id.twitch.tv/oauth2/validate", {
            headers: {
                Authorization: `OAuth ${json.access_token}`
            }
        })
        const validationJson = await validationResponse.json()
        if (!validationResponse.ok) {
            res.status(validationJson.status)
            err = new Error(validationJson.message)
            next(err)
        } else {
            const { login, user_id } = validationJson
            const ModChannels = await Api.getUserModerationChannels(login)

            const uid = sha1(user_id)
            const token = await admin.auth().createCustomToken(uid)
            const userInfo = await Api.getUserInfo(login)
            const displayName = userInfo.display_name
            const profilePicture = userInfo.profile_image_url
            
            // set or modify the users data in firestore
            try {
                await admin.firestore().collection("Streamers").doc(uid).update({
                    displayName,
                    profilePicture,
                    TwitchName: displayName.toLowerCase(),
                    name: displayName.toLowerCase()
                })
            } catch (err) {
                await admin.firestore().collection("Streamers").doc(uid).set({
                    displayName,
                    uid: uid,
                    profilePicture,
                    ModChannels: [],
                    TwitchName: displayName.toLowerCase(),
                    name: displayName.toLowerCase(),
                    appSettings: {
                        TwitchColor: "",
                        YoutubeColor: "",
                        discordColor: "",
                        displayPlatformColors: false,
                        displayPlatformIcons: false,
                        highlightedMessageColor: "",
                        showHeader: true,
                        showSourceButton: false,
                        compact: false,
                        showBorder: false,
                        nameColors: true
                    },
                    discordLinked: false,
                    guildId: "",
                    liveChatId: "",
                    overlaySettings: {
                        TwitchColor: "",
                        YoutubeColor: "",
                        discordColor: "",
                        displayPlatformColors: false,
                        displayPlatformIcons: false,
                        highlightedMessageColor: "",
                        nameColors: true,
                        compact: false
                    },
                    twitchAuthenticated: true,
                    youtubeAuthenticated: false
                })
            }

            res.json({
                token,
                displayName: userInfo.display_name,
                profilePicture: userInfo.profile_image_url,
                ModChannels
            })
        }
    } catch (err) {
        next(err)
    }
})

router.use((req, res) => {
    res.status(404).json({
        status: 404,
        message: "Page Not Found"
    })
})

module.exports = router