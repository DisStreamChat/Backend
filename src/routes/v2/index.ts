import express from "express";

import appRoutes from "./app";
import authRoutes from "./auth";
import discordRoutes from "./discord";
import twitchRoutes from "./twitch";

const router = express.Router();
router.get("/", (req, res) => {
	res.json({
		message: "📺 DisStreamChat API V2 📺",
	});
});

router.use("/discord", discordRoutes);
router.use("/twitch", twitchRoutes);
router.use("/auth", authRoutes);
router.use("/app", appRoutes);

export default router;
