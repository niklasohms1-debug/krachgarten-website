const express = require('express');
const mongoose = require('mongoose');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// JSON-Parsing aktivieren
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// MONGO_URI
const MONGO_URI = process.env.MONGO_URI || "mongodb+srv://niklasohms1_db_user:DEIN_PASSWORT@cluster0.gesrdze.mongodb.net/?appName=Cluster0";

// MIT MONGODB VERBINDEN
mongoose.connect(MONGO_URI)
    .then(() => console.log("✅ Erfolgreich mit MongoDB verbunden!"))
    .catch(err => console.error("❌ MongoDB Verbindungsfehler:", err));

// MONGODB SCHEMA DEFINIEREN
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

// HILFSFUNKTION: Daten holen (oder Standard anlegen)
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
// API ROUTEN (MongoDB)
// ==========================================

// Alle Daten abrufen
app.get('/api/data', async (req, res) => {
    try {
        const data = await getOrInitData();
        res.json(data);
    } catch (err) {
        res.status(500).json({ error: "Fehler beim Laden aus MongoDB" });
    }
});

// Alle Daten speichern / aktualisieren
app.post('/api/data', async (req, res) => {
    try {
        let data = await getOrInitData();
        Object.assign(data, req.body);
        await data.save();
        res.json({ success: true, data });
    } catch (err) {
        res.status(500).json({ error: "Fehler beim Speichern in MongoDB" });
    }
});

// Musikwunsch einsenden
app.post('/api/wishes', async (req, res) => {
    try {
        const data = await getOrInitData();
        const newWish = { id: Date.now(), ...req.body };
        data.wishes.unshift(newWish); // Neuen Wunsch ganz oben einfügen
        await data.save();
        res.json({ success: true, wish: newWish });
    } catch (err) {
        res.status(500).json({ error: "Fehler beim Speichern des Wunsches" });
    }
});

// SERVER STARTEN
app.listen(PORT, () => {
    console.log(`Radio-Website läuft auf Port ${PORT}`);
});
