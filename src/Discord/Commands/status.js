const Discord = require('discord.js')
var XMLHttpRequest = require("xmlhttprequest").XMLHttpRequest;
let statusColor = ""

module.exports = {
    name: "status",
    description: "Displays the system status",
    execute: async (message, args, client) => {
        let fetching = new Discord.MessageEmbed()
            .setDescription("Fetching API...")

        // Page Status API
        StatusPage = "undefined" == typeof StatusPage ? {} : StatusPage, StatusPage.page = function (e) {
            if (!(e = e || {}).page) throw new Error("A pageId is required to initialize.");
            this.apiKey = e.apiKey || null, this.error = e.error || this.error, this.format = e.format || "json", this.pageId = e.page, this.version = e.version || "v2", this.secure = !("secure" in e) || e.secure, this.protocol = this.secure ? "https" : "http", this.host = e.host || "statuspage.io", this.host_with_port_and_protocol = e.test ? "" : this.protocol + "://" + this.pageId + "." + this.host
        }, StatusPage.page.prototype.serialize = function (e, t) {
            var s = [],
                r = {
                    sms: "email_sms",
                    webhook: "endpoint"
                };
            for (var o in e)
                if ("to_sentence" !== o) {
                    var i = o;
                    o = o in r ? r[o] : o;
                    var a = t ? t + "[" + o + "]" : o,
                        n = e[i];
                    s.push("object" == typeof n ? this.serialize(n, a) : encodeURIComponent(a) + "=" + encodeURIComponent(n))
                }
            return s.join("&")
        }, StatusPage.page.prototype.createStatusPageCORSRequest = function (e, t) {
            var s = new XMLHttpRequest;
            return "withCredentials" in s ? s.open(e, t, !0) : "undefined" != typeof XDomainRequest ? (s = new XDomainRequest).open(e, t) : s = null, s
        }, StatusPage.page.prototype.executeRequestAndCallbackWithResponse = function (e) {
            if (!e.path) throw new Error("A path is required to make a request");
            var t = e.path,
                s = e.method || "GET",
                r = e.success || null,
                o = e.error || this.error,
                i = this.host_with_port_and_protocol + "/api/" + this.version + "/" + t + "." + this.format,
                a = this.createStatusPageCORSRequest(s, i);
            if (a)
                if (this.apiKey && (console.log("!!! API KEY IN USE - REMOVE BEFORE DEPLOYING TO PRODUCTION !!!"), console.log("!!! API KEY IN USE - REMOVE BEFORE DEPLOYING TO PRODUCTION !!!"), console.log("!!! API KEY IN USE - REMOVE BEFORE DEPLOYING TO PRODUCTION !!!"), a.setRequestHeader("Authorization", "OAuth " + this.apiKey)), a.onload = function () {
                    var e = JSON.parse(a.responseText);
                    r && r(e)
                }, a.error = o, "POST" === s || "DELETE" === s) {
                    var n = e.data || {};
                    a.setRequestHeader("Content-type", "application/x-www-form-urlencoded"), a.send(this.serialize(n))
                } else a.send()
        }, StatusPage.page.prototype.get = function (e, t) {
            if (t = t || {}, !e) throw new Error("Path is required.");
            if (!t.success) throw new Error("Success Callback is required.");
            var s = t.success || {},
                r = t.error || {};
            this.executeRequestAndCallbackWithResponse({
                path: e,
                success: s,
                error: r,
                method: "GET"
            })
        }, StatusPage.page.prototype.post = function (e, t) {
            if (t = t || {}, !e) throw new Error("Path is required.");
            var s = {};
            if ("subscribers" === e) {
                if (!t.subscriber) throw new Error("Subscriber is required to post.");
                s.subscriber = t.subscriber
            } else {
                if (!t.data) throw new Error("Data is required to post.");
                s = t.data
            }
            var r = t.success || {},
                o = t.error || {};
            this.executeRequestAndCallbackWithResponse({
                data: s,
                path: e,
                success: r,
                error: o,
                method: "POST"
            })
        }, StatusPage.page.prototype["delete"] = function (e, t) {
            if (t = t || {}, !e) throw new Error("Path is required.");
            if (!t.subscriber) throw new Error("Data is required to delete.");
            var s = {};
            "subscribers" === e ? s.subscriber = t.subscriber : s = t.data;
            var r = t.success || {},
                o = t.error || {};
            this.executeRequestAndCallbackWithResponse({
                data: s,
                path: e,
                success: r,
                error: o,
                method: "DELETE"
            })
        }, StatusPage.page.prototype.error = function () {
            console.log("There was an error with your request")
        }, StatusPage.page.prototype.summary = function (e) {
            this.get("summary", e)
        }, StatusPage.page.prototype.status = function (e) {
            this.get("status", e)
        }, StatusPage.page.prototype.components = function (e) {
            this.get("components", e)
        }, StatusPage.page.prototype.incidents = function (e) {
            switch (e.filter) {
                case "unresolved":
                    this.get("incidents/unresolved", e);
                    break;
                case "resolved":
                    this.get("incidents/resolved", e);
                    break;
                default:
                    this.get("incidents", e)
            }
        }, StatusPage.page.prototype.scheduled_maintenances = function (e) {
            switch (e.filter) {
                case "active":
                    this.get("scheduled-maintenances/active", e);
                    break;
                case "upcoming":
                    this.get("scheduled-maintenances/upcoming", e);
                    break;
                default:
                    this.get("scheduled-maintenances", e)
            }
        }, StatusPage.page.prototype.subscribe = function (e) {
            if (!e || !e.subscriber) throw new Error("A subscriber object is required.");
            this.post("subscribers", e)
        }, StatusPage.page.prototype.unsubscribe = function (e) {
            if (!e || !e.subscriber) throw new Error("A subscriber object is required.");
            if (!e.subscriber.id) throw new Error("You must supply a subscriber.id in order to cancel a subscription.");
            this["delete"]("subscribers", e)
        };
        // End of Page Status API

        var sp = new StatusPage.page({ page: '9l4zlxgf7hky' });
        sp.summary({
            success: async function (data) {

                // Embed Color
                if (data.status.indicator === "none") {
                    statusColor = "#04a635"
                }
                else if (data.status.indicator === "minor") {
                    statusColor = "#fb7729"
                }
                else if (data.status.indicator === "major") {
                    statusColor = "#ED592F"
                }
                else if (data.status.indicator === "maintenance") {
                    statusColor = "#05B5DA"
                }

                const msg = await message.channel.send(fetching);
                const statusEmbed = new Discord.MessageEmbed()
                    .setAuthor(`${data.page.name} Status`, message.author.avatarURL(), `${data.page.url}`)
                    .setTitle(`${data.status.description}`)
                    .setDescription(`Find more details on our [Status Page](${data.page.url} '${data.page.name} Status').`)
                    .setURL(`${data.page.url}`)
                    .addFields(
                        { name: `${data.components[1].name}`, value: `${data.components[3].status}` }, // Backend
                        { name: `${data.components[0].name}`, value: `${data.components[4].status}` }, // Website
                    )
                    .setFooter(`Last Update`)
                    .setTimestamp(`${data.page.updated_at}`)
                    .setColor(statusColor)
                msg.edit(statusEmbed)
            }
        });

    }
}
