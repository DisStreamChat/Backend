//@ts-nocheck
import path from "path";

import Canvas from "canvas";

Canvas.registerFont(path.join(__dirname, "../../public/Poppins/Poppins-Regular.ttf"), { family: "Poppins" });
Canvas.registerFont("./assets/fonts/OpenMoji-Black.ttf", { family: "OpenMoji", weight: "normal", style: "normal" });
Canvas.registerFont("./assets/fonts/NotoEmoji-Regular.ttf", { family: "Noto Emoji", weight: "normal", style: "normal" });

// Language Support (Devanagari, Bengali, Tamil, Gujarati and Telugu)
Canvas.registerFont("./assets/fonts/Hind-Regular.ttf", { family: "Hind", weight: "normal", style: "normal" });
Canvas.registerFont("./assets/fonts/Hind-Bold.ttf", { family: "Hind", weight: "bold", style: "normal" });
Canvas.registerFont("./assets/fonts/Hind-Light.ttf", { family: "Hind", weight: "light", style: "normal" });
Canvas.registerFont("./assets/fonts/HindGuntur-Regular.ttf", { family: "Hind Guntur", weight: "normal", style: "normal" });
Canvas.registerFont("./assets/fonts/HindGuntur-Bold.ttf", { family: "Hind Guntur", weight: "bold", style: "normal" });
Canvas.registerFont("./assets/fonts/HindGuntur-Light.ttf", { family: "Hind Guntur", weight: "light", style: "normal" });
Canvas.registerFont("./assets/fonts/HindMadurai-Regular.ttf", { family: "Hind Madurai", weight: "normal", style: "normal" });
Canvas.registerFont("./assets/fonts/HindMadurai-Bold.ttf", { family: "Hind Madurai", weight: "bold", style: "normal" });
Canvas.registerFont("./assets/fonts/HindMadurai-Light.ttf", { family: "Hind Madurai", weight: "light", style: "normal" });
Canvas.registerFont("./assets/fonts/HindSiliguri-Regular.ttf", { family: "Hind Siliguri", weight: "normal", style: "normal" });
Canvas.registerFont("./assets/fonts/HindSiliguri-Bold.ttf", { family: "Hind Siliguri", weight: "bold", style: "normal" });
Canvas.registerFont("./assets/fonts/HindSiliguri-Light.ttf", { family: "Hind Siliguri", weight: "light", style: "normal" });
Canvas.registerFont("./assets/fonts/HindVadodara-Regular.ttf", { family: "Hind Vadodara", weight: "normal", style: "normal" });
Canvas.registerFont("./assets/fonts/HindVadodara-Bold.ttf", { family: "Hind Vadodara", weight: "bold", style: "normal" });
Canvas.registerFont("./assets/fonts/HindVadodara-Light.ttf", { family: "Hind Vadodara", weight: "light", style: "normal" });

// Language Support (Burmese and Thai)
Canvas.registerFont("./assets/fonts/Kanit-Regular.ttf", { family: "Kanit", weight: "normal", style: "normal" });
Canvas.registerFont("./assets/fonts/Kanit-Italic.ttf", { family: "Kanit", weight: "normal", style: "italic" });
Canvas.registerFont("./assets/fonts/Kanit-Bold.ttf", { family: "Kanit", weight: "bold", style: "normal" });
Canvas.registerFont("./assets/fonts/Kanit-BoldItalic.ttf", { family: "Kanit", weight: "bold", style: "italic" });
Canvas.registerFont("./assets/fonts/Kanit-Light.ttf", { family: "Kanit", weight: "light", style: "normal" });
Canvas.registerFont("./assets/fonts/Kanit-LightItalic.ttf", { family: "Kanit", weight: "light", style: "italic" });
Canvas.registerFont("./assets/fonts/Padauk-Regular.ttf", { family: "Padauk", weight: "normal", style: "normal" });
Canvas.registerFont("./assets/fonts/Padauk-Bold.ttf", { family: "Padauk", weight: "bold", style: "normal" });

// Language Support (Japanese, Korean and Chinese)
Canvas.registerFont("./assets/fonts/NotoSansJP-Regular.otf", { family: "Noto Sans JP", weight: "normal", style: "normal" });
Canvas.registerFont("./assets/fonts/NotoSansJP-Bold.otf", { family: "Noto Sans JP", weight: "bold", style: "normal" });
Canvas.registerFont("./assets/fonts/NotoSansJP-Light.otf", { family: "Noto Sans JP", weight: "light", style: "normal" });
Canvas.registerFont("./assets/fonts/NotoSansKR-Regular.otf", { family: "Noto Sans KR", weight: "normal", style: "normal" });
Canvas.registerFont("./assets/fonts/NotoSansKR-Bold.otf", { family: "Noto Sans KR", weight: "bold", style: "normal" });
Canvas.registerFont("./assets/fonts/NotoSansKR-Light.otf", { family: "Noto Sans KR", weight: "light", style: "normal" });
Canvas.registerFont("./assets/fonts/NotoSansTC-Regular.otf", { family: "Noto Sans TC", weight: "normal", style: "normal" });
Canvas.registerFont("./assets/fonts/NotoSansTC-Bold.otf", { family: "Noto Sans TC", weight: "bold", style: "normal" });
Canvas.registerFont("./assets/fonts/NotoSansTC-Light.otf", { family: "Noto Sans TC", weight: "light", style: "normal" });
Canvas.registerFont("./assets/fonts/NotoSansSC-Regular.otf", { family: "Noto Sans SC", weight: "normal", style: "normal" });
Canvas.registerFont("./assets/fonts/NotoSansSC-Bold.otf", { family: "Noto Sans SC", weight: "bold", style: "normal" });
Canvas.registerFont("./assets/fonts/NotoSansSC-Light.otf", { family: "Noto Sans SC", weight: "light", style: "normal" });
Canvas.registerFont("./assets/fonts/NotoSansHK-Regular.otf", { family: "Noto Sans HK", weight: "normal", style: "normal" });
Canvas.registerFont("./assets/fonts/NotoSansHK-Bold.otf", { family: "Noto Sans HK", weight: "bold", style: "normal" });
Canvas.registerFont("./assets/fonts/NotoSansHK-Light.otf", { family: "Noto Sans HK", weight: "light", style: "normal" });

// Main Fonts
Canvas.registerFont("./assets/fonts/whitney-medium.otf", { family: "Whitney", weight: "normal", style: "normal" });
Canvas.registerFont("./assets/fonts/whitney-mediumitalic.otf", { family: "Whitney", weight: "normal", style: "italic" });
Canvas.registerFont("./assets/fonts/whitney-boldsc.otf", { family: "Whitney", weight: "bold", style: "normal" });
Canvas.registerFont("./assets/fonts/whitney-bolditalicsc.otf", { family: "Whitney", weight: "bold", style: "italic" });
Canvas.registerFont("./assets/fonts/whitney-light.otf", { family: "Whitney", weight: "light", style: "normal" });
Canvas.registerFont("./assets/fonts/whitney-lightitalic.otf", { family: "Whitney", weight: "light", style: "italic" });
Canvas.registerFont("./assets/fonts/PTSans-Regular.ttf", { family: "PT Sans", weight: "normal", style: "normal" });
Canvas.registerFont("./assets/fonts/PTSans-Italic.ttf", { family: "PT Sans", weight: "normal", style: "italic" });
Canvas.registerFont("./assets/fonts/PTSans-Bold.ttf", { family: "PT Sans", weight: "bold", style: "normal" });
Canvas.registerFont("./assets/fonts/PTSans-BoldItalic.ttf", { family: "PT Sans", weight: "bold", style: "italic" });

class CanvasWrapper {
	constructor(width, height, type) {
		this.canvas = Canvas.createCanvas(width, height, type);
		this.ctx = this.canvas.getContext("2d");
	}

	rect(x, y, w, h, r = 0) {
		if (w < 2 * r) r = w / 2;
		if (h < 2 * r) r = h / 2;
		this.ctx.beginPath();
		this.ctx.moveTo(x + r, y);
		this.ctx.arcTo(x + w, y, x + w, y + h, r);
		this.ctx.arcTo(x + w, y + h, x, y + h, r);
		this.ctx.arcTo(x, y + h, x, y, r);
		this.ctx.arcTo(x, y, x + w, y, r);
		this.ctx.fill();
		return this;
	}

	fill(color){
		this.ctx.fillStyle = color
	}
}

export default Canvas;
