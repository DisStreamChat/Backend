import express from "express";
import { join } from "path";
const router = express.Router();

router.get("/twitch", async (req, res, next) => {
	res.sendFile(join(__dirname, "../../../public/twitch.html"));
});

router.get("/discord", async (req, res, next) => {
	res.sendFile(join(__dirname, "../../../public/discord.html"));
});

export default router;
