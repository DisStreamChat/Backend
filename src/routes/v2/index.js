require("dotenv").config();
import express from "express";
const router = express.Router();
import discordRoutes from "./discord" 
import twitchRoutes from "./twitch"
import authRoutes from "./auth"

router.use("/discord", discordRoutes)
router.use("/twitch", twitchRoutes)
router.use("/auth", authRoutes)

module.exports = router