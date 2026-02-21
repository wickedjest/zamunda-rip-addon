const { addonBuilder } = require("stremio-addon-sdk");
const axios = require("axios");
const cheerio = require("cheerio");

const BASE = "https://zamunda.rip";

const manifest = {
    id: "zamunda-rip-all",
    version: "1.0.0",
    name: "Zamunda All Torrents",
    description: "Единен каталог с всички торенти от zamunda.rip",
    types: ["other"],
    catalogs: [
        {
            type: "other",
            id: "zamunda-all",
            name: "Zamunda All Torrents"
        }
    ],
    resources: ["catalog", "stream"]
};

const builder = new addonBuilder(manifest);

// Скрейпване на началната страница
async function scrapeAll() {
    const res = await axios.get(BASE);
    const $ = cheerio.load(res.data);

    const items = [];

    $("tr").each((i, el) => {
        const title = $(el).find("a[href*='details']").text().trim();
        const link = $(el).find("a[href*='details']").attr("href");
        const magnet = $(el).find("a[href*='magnet']").attr("href");

        if (title && link) {
            items.push({
                id: link,
                type: "other",
                name: title,
                poster: "https://via.placeholder.com/300x450",
                magnet: magnet || null
            });
        }
    });

    return items;
}

// Catalog handler
builder.defineCatalogHandler(async () => {
    const items = await scrapeAll();
    return { metas: items };
});

// Stream handler
builder.defineStreamHandler(async ({ id }) => {
    const fullUrl = BASE + id;

    const res = await axios.get(fullUrl);
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
});

// ------------------------------
// HTTP SERVER (важно за Render)
// ------------------------------
const http = require("http");

const server = http.createServer((req, res) => {
    builder.getInterface().serveHTTP(req, res);
});

const PORT = process.env.PORT || 7000;
server.listen(PORT, () => {
    console.log("Addon running on port " + PORT);
});
