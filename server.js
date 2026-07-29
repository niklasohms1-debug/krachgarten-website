const express = require('express');
const mongoose = require('mongoose');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// JSON-Parsing & Statische Dateien
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// MONGO_URI
const MONGO_URI = process.env.MONGO_URI || "mongodb+srv://niklasohms1_db_user:DEIN_PASSWORT@cluster0.gesrdze.mongodb.net/?appName=Cluster0";

// VERBINDUNG
mongoose.connect(MONGO_URI)
    .then(() => console.log("✅ Erfolgreich mit MongoDB verbunden!"))
    .catch(err => console.error("❌ MongoDB Verbindungsfehler:", err));

// SCHEMA DEFINITION
const radioSchema = new mongoose.Schema({
    streamName: { type: String, default: "KrachGarten" },
    currentTitle: { type: String, default: "DJ AIR - 24/7 NON STOP" },
    passwords: {
        type: Object,
        default: { admin: "admin123", dj: "dj123" }
    },
    schedule: { type: Array, default: [] },
    wishes: { type: Array, default: [] },
    news: { type: Array, default: [] },
    team: { type: Array, default: [] }
});

const RadioData = mongoose.model('RadioData', radioSchema);

// Hilfsfunktion: Daten holen oder Startdaten anlegen
async function getOrInitData() {
    let data = await RadioData.findOne();
    if (!data) {
        data = await RadioData.create({
            streamName: "KrachGarten",
            currentTitle: "DJ AIR - 24/7 NON STOP",
            passwords: { admin: "admin123", dj: "dj123" },
            schedule: [],
            wishes: [],
            news: [],
            team: []
        });
    }
    return data;
}

// ==========================================
// ALLGEMEINE DATA ROUTEN
// ==========================================

app.get('/api/data', async (req, res) => {
    try {
        const data = await getOrInitData();
        res.json(data);
    } catch (err) {
        res.status(500).json({ error: "Fehler beim Laden" });
    }
});

app.post('/api/data', async (req, res) => {
    try {
        let data = await getOrInitData();
        Object.assign(data, req.body);
        data.markModified('passwords');
        data.markModified('schedule');
        data.markModified('wishes');
        data.markModified('news');
        data.markModified('team');
        await data.save();
        res.json({ success: true, data });
    } catch (err) {
        res.status(500).json({ error: "Fehler beim Speichern" });
    }
});

// ==========================================
// NEWS ROUTEN (GET & POST)
// ==========================================

app.get('/api/news', async (req, res) => {
    try {
        const data = await getOrInitData();
        res.json(data.news || []);
    } catch (err) {
        res.status(500).json({ error: "Fehler beim Laden der News" });
    }
});

app.post('/api/news', async (req, res) => {
    try {
        const data = await getOrInitData();
        if (Array.isArray(req.body)) {
            data.news = req.body;
        } else {
            const newEntry = { id: Date.now(), ...req.body };
            data.news.unshift(newEntry);
        }
        data.markModified('news');
        await data.save();
        res.json({ success: true, news: data.news });
    } catch (err) {
        res.status(500).json({ error: "Fehler beim Speichern der News" });
    }
});

// ==========================================
// WÜNSCHE ROUTEN
// ==========================================

app.get('/api/wishes', async (req, res) => {
    try {
        const data = await getOrInitData();
        res.json(data.wishes || []);
    } catch (err) {
        res.status(500).json({ error: "Fehler beim Laden der Wünsche" });
    }
});

app.post('/api/wishes', async (req, res) => {
    try {
        const data = await getOrInitData();
        if (Array.isArray(req.body)) {
            data.wishes = req.body;
        } else {
            const newWish = { id: Date.now(), ...req.body };
            data.wishes.unshift(newWish);
        }
        data.markModified('wishes');
        await data.save();
        res.json({ success: true, wishes: data.wishes });
    } catch (err) {
        res.status(500).json({ error: "Fehler beim Speichern der Wünsche" });
    }
});

// SERVER START
app.listen(PORT, () => {
    console.log(`Radio-Server läuft auf Port ${PORT}`);
});
