export const allowedOrigins = ["https://www.disstreamchat.com", "http://localhost:3200", "http://localhost:3000"]

export const validateRequest = async (req, res, next) => {
	const apiKey = req.query.key;
	if (apiKey === process.env.DSC_API_KEY) return next();
	const userId = req.query.id;
	if (!userId) {
		return res.status(401).json({ message: "Missing or invalid credentials", code: 401 });
	}
	const otc = req.query.otc;
	const otcData = (await admin.firestore().collection("Secret").doc(userId).get()).data();
	const otcFromDb = otcData?.value;
	if (otcFromDb === otc) {
		const newOtc = uuidv4();
		await admin.firestore().collection("Secret").doc(userId).set({ value: newOtc });
		return next();
	}
	res.status(401).json({ message: "Missing or invalid credentials", code: 401 });
};