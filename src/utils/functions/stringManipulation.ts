export const escapePings = text => text.replace("@", "@‍");

export const unescapeHTML = text => text.replace(/&lt;/gim, "<").replace(/&gt;/gim, ">");
