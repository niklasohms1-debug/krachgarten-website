const express = require('express');
const mongoose = require('mongoose');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// MONGO_URI
const MONGO_URI = process.env.MONGO_URI || "mongodb+srv://niklasohms1_db_user:DEIN_PASSWORT@cluster0.gesrdze.mongodb.net/?appName=Cluster0";

// VERBINDUNG
mongoose.connect(MONGO_URI)
    .then(() => console.log("✅ Erfolgreich mit MongoDB verbunden!"))
    .catch(err => console.error("❌ MongoDB Verbindungsfehler:", err));

// SCHEMA DEFINIEREN
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

// HILFSFUNKTION
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
// ALLGEMEINE ROUTEN & ADMIN-ROUTEN
// ==========================================

// Daten abrufen
app.get(['/api/data', '/api/admin/data'], async (req, res) => {
    try {
        const data = await getOrInitData();
        res.json(data);
    } catch (err) {
        res.status(500).json({ error: "Fehler beim Laden" });
    }
});

// Daten komplett speichern
app.post(['/api/data', '/api/admin/data'], async (req, res) => {
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
// TEAM ROUTEN (/api/team UND /api/admin/team)
// ==========================================

app.get(['/api/team', '/api/admin/team'], async (req, res) => {
    try {
        const data = await getOrInitData();
        res.json(data.team || []);
    } catch (err) {
        res.status(500).json({ error: "Fehler beim Laden des Teams" });
    }
});

app.post(['/api/team', '/api/admin/team'], async (req, res) => {
    try {
        const data = await getOrInitData();
        if (Array.isArray(req.body)) {
            data.team = req.body;
        } else {
            const newMember = { id: Date.now(), ...req.body };
            data.team.push(newMember);
        }
        data.markModified('team');
        await data.save();
        res.json({ success: true, team: data.team });
    } catch (err) {
        res.status(500).json({ error: "Fehler beim Speichern des Teams" });
    }
});

// ==========================================
// NEWS ROUTEN (MIT AUTOMATISCHEM DATUM & UHRZEIT)
// ==========================================

app.get(['/api/news', '/api/admin/news'], async (req, res) => {
    try {
        const data = await getOrInitData();
        res.json(data.news || []);
    } catch (err) {
        res.status(500).json({ error: "Fehler beim Laden der News" });
    }
});

app.post(['/api/news', '/api/admin/news'], async (req, res) => {
    try {
        const data = await getOrInitData();
        
        if (Array.isArray(req.body)) {
            // Falls die komplette News-Liste aktualisiert wird
            data.news = req.body.map(item => {
                const now = new Date();
                const currentDate = now.toLocaleDateString('de-DE', { day: '2-digit', month: 'long', year: 'numeric' });
                const currentTime = now.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' });
                
                return {
                    ...item,
                    date: item.date || `${currentDate} um ${currentTime} Uhr`
                };
            });
        } else {
            // Einzelne neue News erstellen
            const now = new Date();
            const currentDate = now.toLocaleDateString('de-DE', { day: '2-digit', month: 'long', year: 'numeric' });
            const currentTime = now.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' });

            const newEntry = {
                id: Date.now(),
                ...req.body,
                // Nutzt das mitgeschickte Datum oder generiert: "29. Juli 2026 um 14:45 Uhr"
                date: req.body.date && req.body.date !== "undefined" 
                    ? req.body.date 
                    : `${currentDate} um ${currentTime} Uhr`
            };
            
            data.news.unshift(newEntry);
        }
        
        data.markModified('news');
        await data.save();
        res.json({ success: true, news: data.news });
    } catch (err) {
        res.status(500).json({ error: "Fehler beim Speichern der News" });
    }
});

// Optional: News löschen (falls das Admin-Panel DELETE nutzt)
app.delete(['/api/news/:id', '/api/admin/news/:id'], async (req, res) => {
    try {
        const data = await getOrInitData();
        const newsId = req.params.id;
        
        data.news = data.news.filter(n => n.id != newsId);
        data.markModified('news');
        await data.save();
        
        res.json({ success: true, news: data.news });
    } catch (err) {
        res.status(500).json({ error: "Fehler beim Löschen der News" });
    }
});

// ==========================================
// SENDEPLAN ROUTEN
// ==========================================

app.get(['/api/schedule', '/api/admin/schedule'], async (req, res) => {
    try {
        const data = await getOrInitData();
        res.json(data.schedule || []);
    } catch (err) {
        res.status(500).json({ error: "Fehler beim Laden des Sendeplans" });
    }
});

app.post(['/api/schedule', '/api/admin/schedule'], async (req, res) => {
    try {
        const data = await getOrInitData();
        if (Array.isArray(req.body)) {
            data.schedule = req.body;
        } else {
            data.schedule.push({ id: Date.now(), ...req.body });
        }
        data.markModified('schedule');
        await data.save();
        res.json({ success: true, schedule: data.schedule });
    } catch (err) {
        res.status(500).json({ error: "Fehler beim Speichern des Sendeplans" });
    }
});

// ==========================================
// WÜNSCHE ROUTEN (VOLLSTÄNDIG - INKL. /api/wish)
// ==========================================

// Wünsche abrufen
app.get(['/api/wishes', '/api/admin/wishes', '/api/wish', '/api/admin/wish'], async (req, res) => {
    try {
        const data = await getOrInitData();
        res.json(data.wishes || []);
    } catch (err) {
        res.status(500).json({ error: "Fehler beim Laden der Wünsche" });
    }
});

// Wunsch hinzufügen ODER komplette Liste aktualisieren
app.post(['/api/wishes', '/api/admin/wishes', '/api/wish', '/api/admin/wish'], async (req, res) => {
    try {
        const data = await getOrInitData();
        
        if (Array.isArray(req.body)) {
            // Falls das Panel die komplette Liste schickt
            data.wishes = req.body;
        } else {
            // Einzelnen Wunsch von der Wunschbox verarbeiten
            const newWish = {
                id: Date.now(),
                time: new Date().toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' }),
                type: req.body.type || "Musikwunsch",
                name: req.body.name || "Anonym",
                song: req.body.song || "",
                message: req.body.message || req.body.text || "",
                ...req.body
            };
            data.wishes.unshift(newWish);
        }
        
        data.markModified('wishes');
        await data.save();
        res.json({ success: true, wishes: data.wishes, wish: data.wishes[0] });
    } catch (err) {
        res.status(500).json({ error: "Fehler beim Speichern des Wunsches" });
    }
});

// Wunsch löschen
app.delete(['/api/wishes/:id', '/api/admin/wishes/:id', '/api/wish/:id', '/api/admin/wish/:id'], async (req, res) => {
    try {
        const data = await getOrInitData();
        const wishId = req.params.id;
        
        data.wishes = data.wishes.filter(w => w.id != wishId);
        data.markModified('wishes');
        await data.save();
        
        res.json({ success: true, wishes: data.wishes });
    } catch (err) {
        res.status(500).json({ error: "Fehler beim Löschen des Wunsches" });
    }
});

// Wunsch hinzufügen ODER komplette Liste aktualisieren
app.post(['/api/wishes', '/api/admin/wishes'], async (req, res) => {
    try {
        const data = await getOrInitData();
        
        if (Array.isArray(req.body)) {
            // Falls das Frontend die komplette Liste schickt
            data.wishes = req.body;
        } else {
            // Einzelnen Wunsch hinzufügen
            const newWish = {
                id: Date.now(),
                time: new Date().toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' }),
                type: req.body.type || "Musikwunsch",
                name: req.body.name || "Anonym",
                song: req.body.song || "",
                message: req.body.message || req.body.text || "",
                ...req.body
            };
            data.wishes.unshift(newWish);
        }
        
        data.markModified('wishes');
        await data.save();
        res.json({ success: true, wishes: data.wishes });
    } catch (err) {
        res.status(500).json({ error: "Fehler beim Speichern des Wunsches" });
    }
});

// Wunsch löschen (falls das Admin-Panel/DJ-Panel DELETE verwendet)
app.delete(['/api/wishes/:id', '/api/admin/wishes/:id'], async (req, res) => {
    try {
        const data = await getOrInitData();
        const wishId = req.params.id;
        
        data.wishes = data.wishes.filter(w => w.id != wishId);
        data.markModified('wishes');
        await data.save();
        
        res.json({ success: true, wishes: data.wishes });
    } catch (err) {
        res.status(500).json({ error: "Fehler beim Löschen des Wunsches" });
    }
});

app.post(['/api/wishes', '/api/admin/wishes'], async (req, res) => {
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
