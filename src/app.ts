import express from "express";
import http from "http";
import Server from "socket.io";

import cors from "cors";
import bodyParser from "body-parser";
import helmet from "helmet";
import crypto from "crypto";

import root from "./routes/index";
import v2 from "./routes/v2";

export const app = express();
export const server = new http.Server(app);
export const io = new Server(server);

// add the basic middleware to the express app
app.use(helmet());
app.use(cors());

// this function is used to verify twitch webhook requests
app.use(
	bodyParser.json({
		verify: function (req, res, buf, encoding) {
			// is there a hub to verify against
			req.twitch_hub = false;
			if (req.headers && req.headers["x-hub-signature"]) {
				req.twitch_hub = true;

				var xHub = req.headers["x-hub-signature"].split("=");

				req.twitch_hex = crypto.createHmac(xHub[0], process.env.WEBHOOK_SECRET).update(buf).digest("hex");
				req.twitch_signature = xHub[1];
			}
		},
	})
);

// add the routes stored in the 'routes' folder to the app

app.use("/", root);
app.use("/v2", v2);
app.use("/public", express.static("public"));
app.use("/images", express.static("images"));
