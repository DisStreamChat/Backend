import { firestore } from "firebase-admin";
import uuidv1 from "uuidv1";

import { EnvManager } from "../utils/envManager.util";

export const allowedOrigins = [
	"https://www.disstreamchat.com",
	"http://localhost:3200",
	"http://localhost:3000",
];

export const validateRequest = async (req, res, next) => {
	try {
		const apiKey = req.query.key;
		if (apiKey === EnvManager.DSC_API_KEY) return next();
		const userId = req.query.id;
		if (!userId) {
			return res.status(401).json({ message: "Missing or invalid credentials", code: 401 });
		}
		const otc = req.query.otc;
		const otcData = (await firestore().collection("Secret").doc(userId).get()).data();
		const otcFromDb = otcData?.value;
		if (otcFromDb === otc) {
			const newOtc = uuidv1();
			await firestore().collection("Secret").doc(userId).set({ value: newOtc });
			return next();
		}
		res.status(401).json({ message: "Missing or invalid credentials", code: 401 });
	} catch (err) {
		res.status(500).json({
			message: "Internal Error: Make sure you provide valid credentials. " + err.message,
			code: 500,
		});
	}
};
