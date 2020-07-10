const EventEmitter = require("events");
const axios = require("axios");

const {
    // GOOGLE_CLIENT_ID: client_id, // not needed yet
	// GOOGLE_CLIENT_SECRET: client_secret, // not needed yet
	// GOOGLE_REFRESH_TOKEN: refresh_token, // some how we will have to pass this through
	GOOGLE_API_KEY: key,
} = process.env;

let tokenInfo = null;

// async function getAccessToken() {
// 	const { data } = await axios.post("https://oauth2.googleapis.com/token", {
// 		client_id,
// 		client_secret,
// 		refresh_token,
// 		grant_type: "refresh_token",
// 	});
// 	data.expires_time = Date.now() + (data.expires_in - 1) * 1000;
// 	return data;
// }

const liveChatUrl = "https://www.googleapis.com/youtube/v3/liveChat/messages";

async function getEvents(eventType, channelId) {
	const params = new URLSearchParams({
		part: "snippet",
		channelId,
		key,
		type: "video",
		eventType,
	});

    const url = `https://www.googleapis.com/youtube/v3/search?${params}`;
    try{
        const { data } = await axios.get(url);
        return data;
    }catch(err){
        console.log(err.message)
        return {}
    }
}

async function getAllEvents(channelId) {
	const [liveEvents, upcomingEvents] = await Promise.all([getEvents("live", channelId), getEvents("upcoming", channelId)]);

	const events = [].concat(liveEvents.items || [], upcomingEvents.items || []);

	if (events.length) {
		const liveStreams = await Promise.all(
			events.map(async video => {
				const videoParams = new URLSearchParams({
					part: "liveStreamingDetails",
					id: video.id.videoId,
					key,
				});
				const videoUrl = `https://www.googleapis.com/youtube/v3/videos?${videoParams}`;
				const { data } = await axios.get(videoUrl);
				// eslint-disable-next-line
				video.snippet.liveChatId = data.items[0].liveStreamingDetails.activeLiveChatId;
				return {
					...video,
					...video.id,
					...data.items[0],
				};
			})
		);
		return liveStreams;
	}
	return [];
}

function listenMessages(liveChatId) {
	const emitter = new EventEmitter();

	const getMessages = async () => {
		let nextPageToken = "";

		const params = new URLSearchParams({
			liveChatId,
			part: "snippet,authorDetails",
			maxResults: 2000,
			key,
		});

		do {
			let url = `${liveChatUrl}?${params}`;
			if (nextPageToken) {
				url += `&pageToken=${nextPageToken}`;
			}

			try {
				const { data: result } = await axios.get(url);

				if (result.items && result.items.length > 0) {
					const newMessages = result.items.map(item => {
						const { id: message_id, snippet, authorDetails } = item;

						const message = {
							message_id,
							liveChatId,
							message: snippet.displayMessage,
							publishedAt: new Date(snippet.publishedAt),
							channelId: authorDetails.channelId,
							author: authorDetails,
						};

						if (snippet.type === "superChatEvent") {
							message.superChat = snippet.superChatDetails;
						}

						return message;
					});

					if (newMessages.length > 0) {
						newMessages.sort((a, b) => +new Date(a.publishedAt) - +new Date(b.publishedAt));
						emitter.emit("messages", newMessages);
					}
				}
				nextPageToken = result.nextPageToken;

				await new Promise(resolve => {
					setTimeout(resolve, result.pollingIntervalMillis);
				});
			} catch (error) {
				if (error.response && error.response.data && error.response.data.message === "The live chat is no longer live.") {
					nextPageToken = "";
					emitter.emit("event-end", {
						liveChatId,
					});
				} else if (nextPageToken) {
					await new Promise(resolve => {
						setTimeout(resolve, 5000);
					});
				}
			}
		} while (nextPageToken);
	};

	getMessages();

	return emitter;
}

// async function sendMessage(liveChatId, messageText) {
// 	if (!tokenInfo || tokenInfo.expires_time < Date.now()) {
// 		tokenInfo = await getAccessToken();
// 	}
// 	try {
// 		const params = new URLSearchParams({
// 			part: "snippet",
// 			access_token: tokenInfo.access_token,
// 		});
// 		const { data } = await axios.post(`${liveChatUrl}?${params}`, {
// 			snippet: {
// 				type: "textMessageEvent",
// 				liveChatId,
// 				textMessageDetails: {
// 					messageText,
// 				},
// 			},
// 		});
// 		return data;
// 	} catch (error) {
// 		error.data = error.response ? error.response.data : {};
// 		throw error;
// 	}
// }

module.exports = {
	getAllEvents,
	listenMessages,
	// sendMessage,
};
