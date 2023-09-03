import express from "express";

import appRoutes from "./app";
import authRoutes from "./auth";
import discordRoutes from "./discord";
import twitchRoutes from "./twitch";

const router = express.Router();
// default endpoint
router.get("/", (req, res) => {
	res.json({
		message: "📺 DisStreamChat API V2 📺",
	});
});

router.get("/makecoffee", (req, res) => {
	res.status(418).json({
		status: 418,
		message: "I'm a Teapot ☕",
	});
});

router.use("/discord", discordRoutes);
router.use("/twitch", twitchRoutes);
router.use("/auth", authRoutes);
router.use("/app", appRoutes);

export default router;
