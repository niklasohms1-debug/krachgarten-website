process.env.TZ = 'Europe/Berlin';

const express = require('express');
const mongoose = require('mongoose');
const path = require('path');
const https = require('https');
const fs = require('fs');
const multer = require('multer');
const cookieParser = require('cookie-parser');

const app = express();
const PORT = process.env.PORT || 3000;

// ==========================================
// ORDNER & DATEIEN AUTOMATISCH PRÜFEN / ERSTELLEN
// ==========================================
const publicDir = path.join(__dirname, 'public');
const uploadsDir = path.join(publicDir, 'uploads');

if (!fs.existsSync(publicDir)) {
    fs.mkdirSync(publicDir, { recursive: true });
}
if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
}

// 1. AUTOMATISCH index_neu.html ERSTELLEN (FALLS AUF RENDER FEHLT)
const indexNeuPath = path.join(publicDir, 'index_neu.html');
if (!fs.existsSync(indexNeuPath)) {
    fs.writeFileSync(indexNeuPath, `<!DOCTYPE html>
<html lang="de">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Krachgarten V2 (Entwicklungs-Vorschau)</title>
    <style>
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { font-family: 'Segoe UI', sans-serif; background: #121214; color: #fff; padding: 20px; }
        .container { max-width: 900px; margin: 0 auto; }
        .card { background: #202024; border: 1px solid #29292e; border-radius: 12px; padding: 25px; margin-top: 20px; text-align: center; }
        .badge { background: #ff9f43; color: #000; font-size: 0.8rem; font-weight: bold; padding: 4px 10px; border-radius: 4px; }
    </style>
</head>
<body>
    <div class="container">
        <span class="badge">🚧 V2 Vorschauseite</span>
        <div class="card">
            <h1>Willkommen auf index_neu.html! 🚀</h1>
            <p style="color: #a8a8b3; margin-top: 10px;">
                Der geschützte Umbau-Bereich steht. Hier kannst du ab jetzt in Ruhe deine neue Seite aufbauen!
            </p>
        </div>
    </div>
</body>
</html>`);
    console.log("🛠️ index_neu.html wurde automatisch in /public erstellt.");
}

// 2. AUTOMATISCH login.html ERSTELLEN (FALLS FEHLT)
const loginHtmlPath = path.join(publicDir, 'login.html');
if (!fs.existsSync(loginHtmlPath)) {
    fs.writeFileSync(loginHtmlPath, `<!DOCTYPE html>
<html lang="de">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Admin Login | krachgarten</title>
    <style>
        body { font-family: 'Segoe UI', sans-serif; background: #121214; color: #fff; display: flex; justify-content: center; align-items: center; min-height: 100vh; margin: 0; }
        .card { background: #202024; padding: 30px; border-radius: 12px; border: 1px solid #29292e; text-align: center; max-width: 350px; width: 100%; }
        input { width: 100%; padding: 10px; margin: 15px 0; background: #121214; border: 1px solid #29292e; color: #fff; border-radius: 6px; box-sizing: border-box; }
        button { width: 100%; padding: 10px; background: #ff4757; border: none; color: #fff; font-weight: bold; border-radius: 6px; cursor: pointer; }
        button:hover { background: #e03e4d; }
    </style>
</head>
<body>
    <div class="card">
        <h2>🔒 Admin Login</h2>
        <p style="color: #a8a8b3; font-size: 0.85rem; margin-top: 5px;">Zugang zu index_neu.html</p>
        <input type="password" id="password" placeholder="Admin-Passwort">
        <button onclick="login()">Einloggen 🚀</button>
        <p id="err" style="color:#ff4757; display:none; margin-top:10px; font-size:0.85rem;">Passwort falsch!</p>
    </div>
    <script>
        async function login(){
            const password = document.getElementById('password').value;
            const res = await fetch('/api/dev-login', { 
                method: 'POST', 
                headers: { 'Content-Type': 'application/json' }, 
                body: JSON.stringify({ password }) 
            });
            if(res.ok) { 
                window.location.href = '/index_neu.html'; 
            } else { 
                document.getElementById('err').style.display = 'block'; 
            }
        }
    </script>
</body>
</html>`);
    console.log("🛠️ login.html wurde automatisch in /public erstellt.");
}

// ==========================================
// MULTER SPEICHER-KONFIGURATION
// ==========================================
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, uploadsDir);
    },
    filename: (req, file, cb) => {
        const ext = path.extname(file.originalname) || (file.mimetype.startsWith('video') ? '.mp4' : '.jpg');
        cb(null, `private_${Date.now()}${ext}`);
    }
});

const upload = multer({
    storage: storage,
    limits: { fileSize: 500 * 1024 * 1024 } // 500 MB Max
});

// ==========================================
// MIDDLEWARES
// ==========================================
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

app.use('/uploads', express.static(uploadsDir)); // DIRECT STREAM ROUTE

// ==========================================
// SCHUTZ FÜR DIE NEUE BAUSTELLE (index_neu.html)
// ==========================================

// 1. Dev-Login API
app.post('/api/dev-login', async (req, res) => {
    try {
        const { password } = req.body;
        const data = await getOrInitData();
        const adminPass = data.passwords?.admin || "admin123";

        if (password === adminPass) {
            res.cookie('dev_auth', 'authenticated_admin', {
                maxAge: 7 * 24 * 60 * 60 * 1000,
                httpOnly: true,
                sameSite: 'lax'
            });
            return res.json({ success: true });
        }
        return res.status(401).json({ error: "Falsches Passwort" });
    } catch (err) {
        return res.status(500).json({ error: "Serverfehler beim Login" });
    }
});

// 2. Türsteher-Route: Prüft Auth vor Auslieferung von index_neu.html
app.get(['/index_neu', '/index_neu.html'], (req, res) => {
    if (req.cookies && req.cookies.dev_auth === 'authenticated_admin') {
        return res.sendFile(path.join(publicDir, 'index_neu.html'));
    }
    res.redirect('/login.html');
});

// Statische Ordner-Freigabe (NACH der Geschützten Route!)
app.use(express.static(publicDir, { extensions: ['html'] }));

// ==========================================
// MONGO DB & SCHEMAS
// ==========================================
const MONGO_URI = process.env.MONGO_URI || "mongodb+srv://niklasohms1_db_user:DEIN_PASSWORT@cluster0.gesrdze.mongodb.net/?appName=Cluster0";

mongoose.connect(MONGO_URI)
    .then(() => console.log("✅ Erfolgreich mit MongoDB verbunden!"))
    .catch(err => console.error("❌ MongoDB Verbindungsfehler:", err));

const radioSchema = new mongoose.Schema({
    streamName: { type: String, default: "KrachGarten" },
    currentTitle: { type: String, default: "DJ AIR - 24/7 NON STOP" },
    isLive: { type: Boolean, default: false },
    isAutoDj: { type: Boolean, default: true },
    djName: { type: String, default: "" },
    reactions: {
        type: Object,
        default: { '🔥': 0, '💖': 0, '🎸': 0, '🎉': 0, '🍺': 0 }
    },
    passwords: {
        type: Object,
        default: { admin: "admin123", dj: "dj123", editor: "news123" }
    },
    schedule: { type: Array, default: [] },
    wishes: { type: Array, default: [] },
    news: { type: Array, default: [] },
    team: { type: Array, default: [] },
    privateMedia: { type: Array, default: [] }
});

const RadioData = mongoose.model('RadioData', radioSchema);

const pushSubSchema = new mongoose.Schema({
    endpoint: String,
    keys: Object
});
const PushSub = mongoose.model('PushSub', pushSubSchema);

// ==========================================
// HILFSFUNKTIONEN
// ==========================================
async function getOrInitData() {
    let data = await RadioData.findOne();
    if (!data) {
        data = await RadioData.create({
            streamName: "KrachGarten",
            currentTitle: "DJ AIR - 24/7 NON STOP",
            isLive: false,
            isAutoDj: true,
            djName: "",
            reactions: { '🔥': 0, '💖': 0, '🎸': 0, '🎉': 0, '🍺': 0 },
            passwords: { admin: "admin123", dj: "dj123", editor: "news123" },
            schedule: [],
            wishes: [],
            news: [],
            team: [],
            privateMedia: []
        });
    }
    return data;
}

function getGermanDateTime() {
    const now = new Date();
    const germanTime = new Date(now.toLocaleString("en-US", { timeZone: "Europe/Berlin" }));
    
    const currentDate = germanTime.toLocaleDateString('de-DE', { day: '2-digit', month: 'long', year: 'numeric' });
    const currentTime = germanTime.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' });
    
    return `${currentDate} um ${currentTime} Uhr`;
}

// ==========================================
// LOGIN ROUTEN (ADMIN, DJ, EDITOR)
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
app.get(['/api/data', '/api/admin/data'], async (req, res) => {
    try {
        const data = await getOrInitData();
        res.json(data);
    } catch (err) {
        res.status(500).json({ error: "Fehler beim Laden" });
    }
});

app.post(['/api/data', '/api/admin/data', '/api/settings', '/api/dj/title'], async (req, res) => {
    try {
        let data = await getOrInitData();
        Object.assign(data, req.body);
        data.markModified('passwords');
        data.markModified('schedule');
        data.markModified('wishes');
        data.markModified('news');
        data.markModified('team');
        data.markModified('reactions');
        data.markModified('privateMedia');
        await data.save();
        res.json({ success: true, data });
    } catch (err) {
        res.status(500).json({ error: "Fehler beim Speichern" });
    }
});

// ==========================================
// PRIVATER BEREICH (UPLOAD & DELETE)
// ==========================================
app.post('/api/admin/private/upload', upload.single('file'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: "Keine Datei hochgeladen" });
        }

        const title = req.body.title;
        const filePublicUrl = `/uploads/${req.file.filename}`;
        const isVideo = req.file.mimetype.startsWith('video');

        const data = await getOrInitData();
        if (!Array.isArray(data.privateMedia)) data.privateMedia = [];

        const newMedia = {
            id: String(Date.now()),
            url: filePublicUrl,
            title: title || (isVideo ? '🎥 Video' : '🖼️ Foto'),
            type: isVideo ? 'video' : 'image',
            mimeType: req.file.mimetype,
            date: getGermanDateTime()
        };

        data.privateMedia.unshift(newMedia);
        data.markModified('privateMedia');
        await data.save();

        res.json({ success: true, privateMedia: data.privateMedia });
    } catch (err) {
        console.error("Upload-Fehler:", err);
        res.status(500).json({ error: "Fehler beim Verarbeiten der Datei" });
    }
});

app.delete('/api/admin/private/:id', async (req, res) => {
    try {
        const data = await getOrInitData();
        const mediaId = req.params.id;

        if (Array.isArray(data.privateMedia)) {
            const itemToDelete = data.privateMedia.find(m => String(m.id) === String(mediaId));
            if (itemToDelete && itemToDelete.url && itemToDelete.url.startsWith('/uploads/')) {
                const localPath = path.join(publicDir, itemToDelete.url);
                if (fs.existsSync(localPath)) {
                    fs.unlinkSync(localPath);
                }
            }

            data.privateMedia = data.privateMedia.filter(m => String(m.id) !== String(mediaId));
            data.markModified('privateMedia');
            await data.save();
        }

        res.json({ success: true, privateMedia: data.privateMedia });
    } catch (err) {
        res.status(500).json({ error: "Fehler beim Löschen der Datei" });
    }
});

// ==========================================
// EMOJI REAKTIONEN ROUTE
// ==========================================
app.post('/api/reactions', async (req, res) => {
    try {
        const { emoji } = req.body;
        const data = await getOrInitData();
        
        if (!data.reactions) {
            data.reactions = { '🔥': 0, '💖': 0, '🎸': 0, '🎉': 0, '🍺': 0 };
        }

        if (data.reactions[emoji] !== undefined) {
            data.reactions[emoji] = (data.reactions[emoji] || 0) + 1;
            data.markModified('reactions');
            await data.save();
        }

        res.json({ success: true, reactions: data.reactions });
    } catch (err) {
        res.status(500).json({ error: "Fehler beim Speichern der Reaktion" });
    }
});

// ==========================================
// PUSH NOTIFICATION ROUTEN
// ==========================================
app.post('/api/push/subscribe', async (req, res) => {
    try {
        const subscription = req.body;
        if (subscription && subscription.endpoint) {
            const exists = await PushSub.findOne({ endpoint: subscription.endpoint });
            if (!exists) {
                await PushSub.create(subscription);
            }
        }
        res.status(201).json({ success: true });
    } catch (err) {
        res.status(500).json({ error: "Fehler beim Abonnieren" });
    }
});

// ==========================================
// TEAM ROUTEN
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
// NEWS ROUTEN
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
// SENDEPLAN ROUTEN & AUTO-CLEANUP
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
// LAUT.FM API PROXY (FEHLERFREI & ROBUST)
// ==========================================
const LAUTFM_STATION = 'xoticradio';

function fetchLautFm(pathSuffix) {
    return new Promise((resolve) => {
        const cleanSuffix = pathSuffix.startsWith('/') ? pathSuffix : '/' + pathSuffix;
        const options = {
            hostname: 'api.laut.fm',
            path: `/station/${LAUTFM_STATION}${cleanSuffix}`,
            method: 'GET',
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0.0.0 Safari/537.36',
                'Accept': 'application/json',
                'Cache-Control': 'no-cache, no-store, must-revalidate',
                'Pragma': 'no-cache'
            }
        };

        https.get(options, (apiRes) => {
            let body = '';
            apiRes.on('data', chunk => body += chunk);
            apiRes.on('end', () => {
                try {
                    if (apiRes.statusCode === 200) {
                        resolve(JSON.parse(body));
                    } else {
                        console.error(`Laut.fm HTTP Status ${apiRes.statusCode} für ${cleanSuffix}`);
                        resolve(null);
                    }
                } catch (e) {
                    resolve(null);
                }
            });
        }).on('error', (err) => {
            console.error("Laut.fm Verbindungsfehler:", err.message);
            resolve(null);
        });
    });
}

app.get('/api/lautfm/current', async (req, res) => {
    res.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    res.set('Pragma', 'no-cache');
    res.set('Expires', '0');

    try {
        // 1. Primären Song abfragen
        let song = await fetchLautFm('/current_song');

        // 2. Prüfen, ob der gelieferte Song abgelaufen ist
        let isExpired = false;
        if (song && song.ends_at) {
            const endsAtMs = Date.parse(song.ends_at);
            if (!isNaN(endsAtMs) && Date.now() > endsAtMs + 3000) {
                isExpired = true;
            }
        }

        // 3. Falls leer oder abgelaufen -> aus Historie nachladen
        if (!song || !song.title || isExpired) {
            const history = await fetchLautFm('/last_songs');
            if (Array.isArray(history) && history.length > 0) {
                song = history[0];
            }
        }

        res.json(song || {});
    } catch (err) {
        res.status(500).json({ error: "Fehler beim Laden des Songs" });
    }
});

app.get('/api/lautfm/history', async (req, res) => {
    res.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    res.set('Pragma', 'no-cache');
    res.set('Expires', '0');

    const history = await fetchLautFm('/last_songs');
    res.json(history || []);
});

app.get('/api/lautfm/station', async (req, res) => {
    res.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    res.set('Pragma', 'no-cache');
    res.set('Expires', '0');

    const station = await fetchLautFm('');
    res.json(station || {});
});

// SERVER START
app.listen(PORT, () => {
    console.log(`Radio-Server läuft auf Port ${PORT}`);
});
