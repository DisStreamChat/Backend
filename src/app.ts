;
import express from "express";
import * as http from "http";
import * as socketio from "socket.io";

import cors from "cors";
import bodyParser from "body-parser";
import helmet from "helmet";
import * as crypto from "crypto";

export const app = express();
export const server = new http.Server(app);
export const io = socketio(server);


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
app.use("/", require("./routes/index"));
app.use("/v2", require("./routes/v2"))
app.use("/public", express.static("public"));
app.use("/images", express.static("images"));

