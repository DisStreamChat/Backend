import fs, {promises} from "fs"
import path from "path"

const loggingPath = path.join(__dirname, "../../", "logging");


export const log = async (loggingString, {file, writeToConsole=false}={}) => {
	const loggingFilePath = path.join(loggingPath, file || `${new Date().toLocaleDateString().replace(/\//g, "-")}.log`);
	if (!fs.existsSync(loggingPath)) {
		console.log("creating directory");
		await promises.mkdir(loggingPath, { recursive: true });
		await promises.writeFile(loggingFilePath, "");
	}

	loggingString = `${new Date().toLocaleTimeString("en-us", {timeZone: "America/New_York", timeZoneName: "short"})}: ${loggingString}`

	promises.appendFile(loggingFilePath, `\n${loggingString}`)
	if(writeToConsole){
		console.log(loggingString)
	}
}