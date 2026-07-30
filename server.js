process.env.TZ = 'Europe/Berlin';

const express = require('express');
const mongoose = require('mongoose');
const path = require('path');
const https = require('https');

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
        default: { admin: "admin123", dj: "dj123", editor: "news123" }
    },
    schedule: { type: Array, default: [] },
    wishes: { type: Array, default: [] },
    news: { type: Array, default: [] },
    team: { type: Array, default: [] }
});

const RadioData = mongoose.model('RadioData', radioSchema);

// HILFSFUNKTION: DATEN HOLEN ODER ERSTELLEN
async function getOrInitData() {
    let data = await RadioData.findOne();
    if (!data) {
        data = await RadioData.create({
            streamName: "KrachGarten",
            currentTitle: "DJ AIR - 24/7 NON STOP",
            passwords: { admin: "admin123", dj: "dj123", editor: "news123" },
            schedule: [],
            wishes: [],
            news: [],
            team: []
        });
    }
    return data;
}

// HILFSFUNKTION: DEUTSCHE UHRZEIT & DATUM ERSTELLEN (EXAKTE ZEITZONE)
function getGermanDateTime() {
    const now = new Date();
    const germanTime = new Date(now.toLocaleString("en-US", { timeZone: "Europe/Berlin" }));
    
    const currentDate = germanTime.toLocaleDateString('de-DE', { day: '2-digit', month: 'long', year: 'numeric' });
    const currentTime = germanTime.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' });
    
    return `${currentDate} um ${currentTime} Uhr`;
}

// ==========================================
// LOGIN ROUTEN (ADMIN, DJ, REDAKTEUR)
// ==========================================

app.post('/api/admin/login', async (req, res) => {
    const { username, password } = req.body;
    const data = await getOrInitData();
    const pass = data.passwords?.admin || "admin123";
    
    if (username === "admin" && password === pass) {
        return res.json({ success: true });
    }
    res.status(401).json({ error: "Zugangsdaten falsch" });
});

app.post('/api/dj/login', async (req, res) => {
    const { username, password } = req.body;
    const data = await getOrInitData();
    const pass = data.passwords?.dj || "dj123";
    
    if ((username === "dj" || username === "djstudio") && password === pass) {
        return res.json({ success: true });
    }
    res.status(401).json({ error: "Zugangsdaten falsch" });
});

app.post('/api/editor/login', async (req, res) => {
    const { username, password } = req.body;
    const data = await getOrInitData();
    const pass = data.passwords?.editor || "news123";
    
    if ((username === "redakteur" || username === "editor") && password === pass) {
        return res.json({ success: true });
    }
    res.status(401).json({ error: "Zugangsdaten falsch" });
});

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

// Daten komplett speichern / Radio-Settings ändern
app.post(['/api/data', '/api/admin/data', '/api/settings', '/api/dj/title'], async (req, res) => {
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

app.delete('/api/admin/team/:id', async (req, res) => {
    try {
        const data = await getOrInitData();
        data.team = data.team.filter(m => String(m.id) !== String(req.params.id));
        data.markModified('team');
        await data.save();
        res.json({ success: true, team: data.team });
    } catch (err) {
        res.status(500).json({ error: "Fehler beim Löschen des Teammitglieds" });
    }
});

// ==========================================
// NEWS ROUTEN (MIT KORREKTER DEUTSCHER UHRZEIT)
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
        const defaultDateTime = getGermanDateTime();

        if (Array.isArray(req.body)) {
            data.news = req.body.map(item => ({
                ...item,
                date: (item.date && item.date !== "undefined") ? item.date : defaultDateTime
            }));
        } else {
            const newEntry = {
                id: Date.now(),
                ...req.body,
                date: (req.body.date && req.body.date !== "undefined") 
                    ? req.body.date 
                    : defaultDateTime
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

app.delete(['/api/news/:id', '/api/admin/news/:id'], async (req, res) => {
    try {
        const data = await getOrInitData();
        const newsId = req.params.id;
        
        data.news = data.news.filter(n => String(n.id) !== String(newsId));
        data.markModified('news');
        await data.save();
        
        res.json({ success: true, news: data.news });
    } catch (err) {
        res.status(500).json({ error: "Fehler beim Löschen der News" });
    }
});

// ==========================================
// SENDEPLAN ROUTEN (INTELLIGENTE DATUMS- & UHRZEIT-LÖSCHUNG)
// ==========================================

const schedulePaths = [
    '/api/schedule', '/api/admin/schedule', '/api/dj/schedule',
    '/api/sendeplan', '/api/admin/sendeplan', '/api/dj/sendeplan',
    '/api/plan', '/api/admin/plan', '/api/dj/plan'
];

function isShowExpired(entry) {
    if (!entry.endTime && !entry.time) return false;

    try {
        const now = new Date(new Date().toLocaleString("en-US", { timeZone: "Europe/Berlin" }));
        const dayInput = (entry.day || '').trim().toLowerCase();
        const daysOfWeek = ['sonntag', 'montag', 'dienstag', 'mittwoch', 'donnerstag', 'freitag', 'samstag'];
        const currentDayIdx = now.getDay();

        if (dayInput === 'morgen') return false;
        
        if (daysOfWeek.includes(dayInput)) {
            const entryDayIdx = daysOfWeek.indexOf(dayInput);
            if (entryDayIdx > currentDayIdx) return false;
            if (entryDayIdx < currentDayIdx) return true; 
        }

        const dateMatch = dayInput.match(/(\d{1,2})\.(\d{1,2})\.?(\d{2,4})?/);
        if (dateMatch) {
            const day = parseInt(dateMatch[1], 10);
            const month = parseInt(dateMatch[2], 10) - 1;
            const year = dateMatch[3] ? (dateMatch[3].length === 2 ? 2000 + parseInt(dateMatch[3], 10) : parseInt(dateMatch[3], 10)) : now.getFullYear();

            const entryDate = new Date(year, month, day);
            const todayDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());

            if (entryDate > todayDate) return false;
            if (entryDate < todayDate) return true; 
        }

        let endTimeStr = entry.endTime || entry.time.split('-')[1] || entry.time;
        endTimeStr = endTimeStr.trim();

        const [hours, minutes] = endTimeStr.split(':').map(Number);
        if (isNaN(hours) || isNaN(minutes)) return false;

        const showEndTime = new Date(now);
        showEndTime.setHours(hours, minutes, 0, 0);

        return now > showEndTime;

    } catch (e) {
        return false;
    }
}

async function cleanupExpiredSchedule() {
    try {
        const data = await getOrInitData();
        if (Array.isArray(data.schedule) && data.schedule.length > 0) {
            const initialLength = data.schedule.length;
            data.schedule = data.schedule.filter(entry => !isShowExpired(entry));
            
            if (data.schedule.length !== initialLength) {
                data.markModified('schedule');
                await data.save();
                console.log("🧹 Abgelaufene Sendung(en) automatisch entfernt.");
            }
        }
    } catch (err) {
        console.error("Fehler bei Sendeplan-Bereinigung:", err);
    }
}

setInterval(cleanupExpiredSchedule, 60 * 1000);

app.get(schedulePaths, async (req, res) => {
    try {
        await cleanupExpiredSchedule();
        const data = await getOrInitData();
        res.json(data.schedule || []);
    } catch (err) {
        res.status(500).json({ error: "Fehler beim Laden des Sendeplans" });
    }
});

app.post(schedulePaths, async (req, res) => {
    try {
        const data = await getOrInitData();
        if (!Array.isArray(data.schedule)) data.schedule = [];

        if (Array.isArray(req.body)) {
            data.schedule = req.body;
        } else if (req.body && typeof req.body === 'object') {
            const djName = req.body.dj || req.body.name || req.body.artist || "DJ";
            const newEntry = {
                id: Date.now(),
                ...req.body,
                dj: djName,
                name: djName
            };
            data.schedule.push(newEntry);
        }

        data.markModified('schedule');
        await data.save();
        res.json({ success: true, schedule: data.schedule });
    } catch (err) {
        res.status(500).json({ error: "Fehler beim Speichern des Sendeplans" });
    }
});

app.delete(schedulePaths.map(p => `${p}/:id`), async (req, res) => {
    try {
        const data = await getOrInitData();
        const entryId = req.params.id;
        
        if (Array.isArray(data.schedule)) {
            data.schedule = data.schedule.filter(s => String(s.id) !== String(entryId));
            data.markModified('schedule');
            await data.save();
        }
        
        res.json({ success: true, schedule: data.schedule });
    } catch (err) {
        res.status(500).json({ error: "Fehler beim Löschen der Sendung" });
    }
});

// ==========================================
// WÜNSCHE ROUTEN
// ==========================================

app.get(['/api/wishes', '/api/admin/wishes', '/api/wish', '/api/admin/wish'], async (req, res) => {
    try {
        const data = await getOrInitData();
        res.json(data.wishes || []);
    } catch (err) {
        res.status(500).json({ error: "Fehler beim Laden der Wünsche" });
    }
});

app.post(['/api/wishes', '/api/admin/wishes', '/api/wish', '/api/admin/wish'], async (req, res) => {
    try {
        const data = await getOrInitData();
        
        if (Array.isArray(req.body)) {
            data.wishes = req.body;
        } else {
            const now = new Date();
            const germanTime = new Date(now.toLocaleString("en-US", { timeZone: "Europe/Berlin" }));
            const currentTime = germanTime.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' });

            const newWish = {
                id: Date.now(),
                time: currentTime,
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

app.delete(['/api/wishes/:id', '/api/admin/wishes/:id', '/api/wish/:id', '/api/admin/wish/:id'], async (req, res) => {
    try {
        const data = await getOrInitData();
        const wishId = req.params.id;
        
        data.wishes = data.wishes.filter(w => String(w.id) !== String(wishId));
        data.markModified('wishes');
        await data.save();
        
        res.json({ success: true, wishes: data.wishes });
    } catch (err) {
        res.status(500).json({ error: "Fehler beim Löschen des Wunsches" });
    }
});

// ==========================================
// RADIO.CO API PROXY (KORREKTE STATION ID: s5d31fcd9d)
// ==========================================
app.get('/api/radioco/status', (req, res) => {
    const fetchUrl = (targetUrl) => {
        const options = {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                'Accept': 'application/json'
            }
        };

        https.get(targetUrl, options, (apiRes) => {
            if (apiRes.statusCode >= 300 && apiRes.statusCode < 400 && apiRes.headers.location) {
                return fetchUrl(apiRes.headers.location);
            }

            let body = '';
            apiRes.on('data', chunk => body += chunk);
            apiRes.on('end', () => {
                try {
                    const data = JSON.parse(body);
                    res.json(data);
                } catch (e) {
                    res.status(500).json({ error: "JSON Parse Fehler", raw: body });
                }
            });
        }).on('error', (err) => {
            console.error("Radio.co API Fehler:", err);
            res.status(500).json({ error: "Fehler beim Laden von Radio.co" });
        });
    };

    fetchUrl('https://public.radio.co/stations/s5d31fcd9d/status');
});

// SERVER START
app.listen(PORT, () => {
    console.log(`Radio-Server läuft auf Port ${PORT}`);
});
