import bodyParser from "body-parser";
import cors from "cors";
import crypto from "crypto";
import express, { Request } from "express";
import helmet from "helmet";
import http from "http";
import Server from "socket.io";

import root from "./routes/index";
import v2 from "./routes/v2";
import { EnvManager } from "./utils/envManager.util";

export const app = express();
export const server = new http.Server(app);
export const io = new Server(server);

// add the basic middleware to the express app
app.use(helmet());
app.use(cors());

// this function is used to verify twitch webhook requests
app.use(
	bodyParser.json({
		verify: function (
			req: Request & { twitch_hub: boolean; twitch_hex: string; twitch_signature: string },
			_res,
			buf
		) {
			// is there a hub to verify against
			req.twitch_hub = false;
			if (req.headers && req.headers["x-hub-signature"]) {
				req.twitch_hub = true;

				var xHub = (req.headers["x-hub-signature"] as string).split("=");

				req.twitch_hex = crypto
					.createHmac(xHub[0], EnvManager.TWITCH_WEBHOOK_SECRET)
					.update(buf)
					.digest("hex");
				req.twitch_signature = xHub[1];
			}
		},
	})
);

app.use("/", root);
app.use("/v2", v2);
app.use((req, res) => {
	res.status(404).json({
		status: 404,
		message: "Page Not Found",
	});
});
