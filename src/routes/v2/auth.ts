require("dotenv").config();
import express from "express";
import path from "path"
const router = express.Router();

router.get("/twitch", async (req, res, next) => {
	res.sendFile(path.join(__dirname, "../../../public/twitch.html"));
});

router.get("/discord", async (req, res, next) => {
	res.sendFile(path.join(__dirname, "../../../public/discord.html"));
});


export default router