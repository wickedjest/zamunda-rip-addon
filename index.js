const { addonBuilder } = require("stremio-addon-sdk");
const axios = require("axios");
const cheerio = require("cheerio");
const express = require("express");

const BASE = "https://zamunda.rip";

// ------------------------------
// MANIFEST
// ------------------------------
const manifest = {
    id: "community.zamunda.rip.all",
    version: "1.0.0",
    name: "Zamunda RIP All Torrents",
    description: "Каталог с всички торенти от zamunda.rip",
    logo: "https://www.stremio.com/website/stremio-logo-small.png",

    types: ["movie"],
    resources: ["catalog", "stream", "meta"],

    catalogs: [
        {
            type: "movie",
            id: "zamunda-all",
            name: "Zamunda All Torrents"
        }
    ],

    idPrefixes: [""]
};

const builder = new addonBuilder(manifest);

// ------------------------------
// SCRAPER
// ------------------------------
async function scrapeAll() {
    try {
        const res = await axios.get(BASE, { timeout: 10000 });
        const $ = cheerio.load(res.data);

        const items = [];

        $("tr").each((i, el) => {
            const title = $(el).find("a[href*='details']").text().trim();
            const link = $(el).find("a[href*='details']").attr("href");

            if (title && link) {
                items.push({
                    id: link,
                    type: "movie",
                    name: title,
                    poster: "https://via.placeholder.com/300x450"
                });
            }
        });

        return items;
    } catch (err) {
        console.error("Scraper error:", err);
        return [];
    }
}

// ------------------------------
// CATALOG HANDLER
// ------------------------------
builder.defineCatalogHandler(async ({ type, id, extra }) => {
    try {
        const items = await scrapeAll();
        return { metas: items };
    } catch (err) {
        console.error("Catalog handler error:", err);
        return { metas: [] };
    }
});

// ------------------------------
// META HANDLER (fixes "No handler")
// ------------------------------
builder.defineMetaHandler(async ({ type, id, extra }) => {
    return {
        meta: {
            id,
            type: "movie",
            name: "Unknown",
            poster: "https://via.placeholder.com/300x450"
        }
    };
});

// ------------------------------
// STREAM HANDLER
// ------------------------------
builder.defineStreamHandler(async ({ type, id, extra }) => {
    try {
        const fullUrl = BASE + id;

        const res = await axios.get(fullUrl, { timeout: 10000 });
        const $ = cheerio.load(res.data);

        const magnet = $("a[href*='magnet']").attr("href");

        if (!magnet) return { streams: [] };

        return {
            streams: [
                {
                    title: "Zamunda Magnet",
                    url: magnet
                }
            ]
        };
    } catch (err) {
        console.error("Stream handler error:", err);
        return { streams: [] };
    }
});

// ------------------------------
// EXPRESS SERVER
// ------------------------------
const app = express();

app.use((req, res, next) => {
    res.setHeader("Access-Control-Allow-Origin", "*");
    next();
});

const addonInterface = builder.getInterface();

app.get("/manifest.json", (req, res) => {
    res.json(addonInterface.manifest);
});

app.get("/:resource/:type/:id.json", (req, res) => {
    addonInterface.get(req, res);
});

// ------------------------------
// GLOBAL ERROR HANDLERS
// ------------------------------
process.on("unhandledRejection", (reason) => {
    console.error("GLOBAL Unhandled Rejection:", reason);
});

process.on("uncaughtException", (err) => {
    console.error("GLOBAL Uncaught Exception:", err);
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => {
    console.log("Addon running on port " + PORT);
});
