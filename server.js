process.env.TZ = 'Europe/Berlin';

const express = require('express');
const mongoose = require('mongoose');
const path = require('path');
const https = require('https');
const fs = require('fs');
const multer = require('multer');
const cookieParser = require('cookie-parser');
const nodemailer = require('nodemailer');

const app = express();
const PORT = process.env.PORT || 3000;

// ==========================================
// SMTP E-MAIL TRANSPORTER KONFIGURATION
// ==========================================
const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'smtp-relay.brevo.com',
    port: parseInt(process.env.SMTP_PORT || '587'),
    secure: false, 
    auth: {
        user: process.env.SMTP_USER || '',
        pass: process.env.SMTP_PASS || ''
    }
});

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

// 1. AUTOMATISCH index_neu.html ERSTELLEN (FALLS FEHLT)
const indexNeuPath = path.join(publicDir, 'index_neu.html');
if (!fs.existsSync(indexNeuPath)) {
    fs.writeFileSync(indexNeuPath, `<!DOCTYPE html>
<html lang="de">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Krachgarten Radio | Dashboard V2</title>
</head>
<body>
    <h1>Krachgarten Radio V2</h1>
    <p>Die Seite wird geladen...</p>
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

app.use('/uploads', express.static(uploadsDir));

// ==========================================
// MONGO DB & SCHEMAS
// ==========================================
const MONGO_URI = process.env.MONGO_URI || "mongodb+srv://niklasohms1_db_user:DEIN_PASSWORT@cluster0.gesrdze.mongodb.net/?appName=Cluster0";

mongoose.connect(MONGO_URI)
    .then(() => console.log("✅ Erfolgreich mit MongoDB verbunden!"))
    .catch(err => console.error("❌ MongoDB Verbindungsfehler:", err));

// 1. USER SCHEMA
const userSchema = new mongoose.Schema({
    username: { type: String, required: true, unique: true },
    email: { type: String, required: true },
    password: { type: String, required: true },
    krachies: { type: Number, default: 0 },
    avatar: { type: String, default: '🕺' },
    status: { type: String, default: 'Neu bei Krachgarten Radio!' },
    isAdmin: { type: Boolean, default: false },
    isVerified: { type: Boolean, default: false },
    verifyCode: { type: String, default: '' },
    inventory: { type: Object, default: { hasGoldName: false } }
}, { timestamps: true });

const User = mongoose.model('User', userSchema);

// 2. MAIN RADIO DATA SCHEMA
const radioSchema = new mongoose.Schema({
    streamName: { type: String, default: "KrachGarten" },
    currentTitle: { type: String, default: "DJ AIR - 24/7 NON STOP" },
    isLive: { type: Boolean, default: false },
    isAutoDj: { type: Boolean, default: true },
    djName: { type: String, default: "" },
    maintenanceMode: { type: Boolean, default: false },
    scheduledSwitch: { type: Date, default: null },
    isNewSiteDefault: { type: Boolean, default: false },
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
    privateMedia: { type: Array, default: [] },
    shopOrders: { type: Array, default: [] },
    songNominations: {
        type: Array,
        default: [
            { id: 1, title: "Labyrinth der Träume", artist: "Anubis Beats", votes: 42, cover: "https://via.placeholder.com/50/0b4975/ffffff?text=Anubis" },
            { id: 2, title: "Habbo Retro Night", artist: "Pixel Sound System", votes: 89, cover: "https://via.placeholder.com/50/ff6b35/ffffff?text=Pixel" },
            { id: 3, title: "Krachgarten Hymne V2", artist: "DJ Niklas & Friends", votes: 65, cover: "https://via.placeholder.com/50/10ac84/ffffff?text=DJ" }
        ]
    }
});

const RadioData = mongoose.model('RadioData', radioSchema);

// 3. PUSH SUBSCRIPTION SCHEMA
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
            maintenanceMode: false,
            scheduledSwitch: null,
            isNewSiteDefault: false,
            reactions: { '🔥': 0, '💖': 0, '🎸': 0, '🎉': 0, '🍺': 0 },
            passwords: { admin: "admin123", dj: "dj123", editor: "news123" },
            schedule: [],
            wishes: [],
            news: [
                {
                    id: 1,
                    title: "Willkommen auf Krachgarten V2!",
                    author: "DJ_Niklas",
                    date: getGermanDateTime(),
                    summary: "Das neue Dashboard ist online! Mit Minigames, Cover-Bildern und Datenbank-Anbindung.",
                    content: "Liebe Krachgarten-Community,\n\nwir freuen uns riesig, euch die brandneue Version von Krachgarten Radio zu präsentieren! Ab sofort werden eure Kommentare, Song-Votes und Profile direkt in unserer Cloud-Datenbank gespeichert.\n\nViel Spaß beim Zuhören und Mitmachen!",
                    comments: []
                }
            ],
            team: [],
            privateMedia: [],
            shopOrders: [],
            songNominations: [
                { id: 1, title: "Labyrinth der Träume", artist: "Anubis Beats", votes: 42, cover: "https://via.placeholder.com/50/0b4975/ffffff?text=Anubis" },
                { id: 2, title: "Habbo Retro Night", artist: "Pixel Sound System", votes: 89, cover: "https://via.placeholder.com/50/ff6b35/ffffff?text=Pixel" },
                { id: 3, title: "Krachgarten Hymne V2", artist: "DJ Niklas & Friends", votes: 65, cover: "https://via.placeholder.com/50/10ac84/ffffff?text=DJ" }
            ]
        });
    }
    return data;
}

function getGermanDateTime() {
    const now = new Date();
    const germanTime = new Date(now.toLocaleString("en-US", { timeZone: "Europe/Berlin" }));
    return `${germanTime.toLocaleDateString('de-DE')} um ${germanTime.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })} Uhr`;
}

function checkShouldShowNewSite(data) {
    if (data.isNewSiteDefault) return true;
    if (data.scheduledSwitch) {
        const now = new Date();
        const switchTime = new Date(data.scheduledSwitch);
        if (!isNaN(switchTime.getTime()) && now >= switchTime) {
            return true;
        }
    }
    return false;
}

// ==========================================
// SITE-STATUS ROUTE (FÜR FRONTEND-CHECK)
// ==========================================
app.get('/api/site-status', async (req, res) => {
    try {
        const data = await getOrInitData();
        const isNew = checkShouldShowNewSite(data);
        res.json({
            isNewSite: isNew,
            maintenance: data.maintenanceMode,
            scheduledSwitch: data.scheduledSwitch
        });
    } catch(err) {
        res.json({ isNewSite: true, maintenance: false });
    }
});

// ==========================================
// HAUPTROUTE: WARTUNG & UMSCHALT-TIMER
// ==========================================
app.get('/', async (req, res) => {
    try {
        const data = await getOrInitData();
        const now = new Date();

        if (data.maintenanceMode && (!req.cookies || req.cookies.dev_auth !== 'authenticated_admin')) {
            return res.send(`
                <!DOCTYPE html>
                <html lang="de">
                <head>
                    <meta charset="UTF-8">
                    <meta name="viewport" content="width=device-width, initial-scale=1.0">
                    <title>Wartungsarbeiten | Krachgarten Radio</title>
                    <style>
                        body { font-family: 'Verdana', sans-serif; background: #0b4975; color: #fff; text-align: center; padding: 60px 20px; margin:0; }
                        .box { background: #17191e; border: 3px solid #ff6b35; max-width: 520px; margin: 0 auto; padding: 35px; border-radius: 12px; box-shadow: 0 10px 25px rgba(0,0,0,0.6); }
                        h1 { color: #ff9f43; margin-bottom: 15px; font-size: 1.8rem; }
                        p { line-height: 1.6; color: #dcdde1; }
                    </style>
                </head>
                <body>
                    <div class="box">
                        <h1>🚧 Wartungsarbeiten</h1>
                        <p>Krachgarten Radio wird gerade für dich aktualisiert und vorbereitet!</p>
                        <p style="color:#f1c40f; font-weight:bold; margin-top:20px;">Wir sind in Kürze wieder für dich On Air! 📻✨</p>
                    </div>
                </body>
                </html>
            `);
        }

        const isScheduledTimeReached = data.scheduledSwitch && now >= new Date(data.scheduledSwitch);
        const shouldShowNewSite = data.isNewSiteDefault || isScheduledTimeReached;

        if (shouldShowNewSite) {
            return res.sendFile(path.join(publicDir, 'index_neu.html'));
        }

        if (fs.existsSync(path.join(publicDir, 'index.html'))) {
            return res.sendFile(path.join(publicDir, 'index.html'));
        } else {
            return res.sendFile(path.join(publicDir, 'index_neu.html'));
        }
    } catch (err) {
        res.sendFile(path.join(publicDir, 'index_neu.html'));
    }
});

// DEV LOGIN FÜR BAUSTELLEN-ZUGRIFF
app.post('/api/dev-login', async (req, res) => {
    try {
        const { password } = req.body;
        const data = await getOrInitData();
        const adminPass = data.passwords?.admin || "admin123";

        if (password === adminPass || password === "admin") {
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

// TÜRSTEHER FÜR index_neu.html
app.get(['/index_neu', '/index_neu.html'], (req, res) => {
    res.sendFile(path.join(publicDir, 'index_neu.html'));
});

// Statische Ordner-Freigabe
app.use(express.static(publicDir, { extensions: ['html'] }));

// ==========================================
// USER AUTHENTICATION & PROFIL ROUTEN
// ==========================================

// 1. REGISTRIERUNG
app.post('/api/auth/register', async (req, res) => {
    try {
        const { username, email, email1, password, pass1, code } = req.body;
        const userMail = (email || email1 || '').toLowerCase().trim();
        const userPass = password || pass1;
        const verifyCode = code || Math.floor(100000 + Math.random() * 900000).toString();

        if (!username || !userMail || !userPass) {
            return res.status(400).json({ error: "Bitte alle Felder ausfüllen." });
        }

        const existingUser = await User.findOne({
            $or: [
                { username: new RegExp('^' + username.trim() + '$', 'i') },
                { email: userMail }
            ]
        });

        if (existingUser) {
            return res.status(400).json({ error: "Benutzername oder E-Mail existiert bereits." });
        }

        const isAdmin = (username.toLowerCase() === 'admin' || username.toLowerCase() === 'niklas');

        const newUser = await User.create({
            username: username.trim(),
            email: userMail,
            password: userPass,
            krachies: 0,
            avatar: isAdmin ? '👑' : '🕺',
            status: isAdmin ? 'Krachgarten Radio Administrator ⚡' : 'Neu bei Krachgarten Radio!',
            isAdmin: isAdmin,
            isVerified: false,
            verifyCode: verifyCode,
            inventory: { hasGoldName: false }
        });

        if (process.env.SMTP_USER && process.env.SMTP_PASS) {
            const mailOptions = {
                from: `"Krachgarten Radio" <${process.env.SMTP_USER}>`,
                to: userMail,
                subject: '✉️ Dein Bestätigungscode für Krachgarten Radio',
                html: `
                    <div style="font-family: Arial, sans-serif; padding: 20px; background: #f4f4f4;">
                        <h2 style="color: #ff6b35;">Willkommen bei Krachgarten, ${username}!</h2>
                        <p>Dein 6-stelliger Bestätigungscode lautet:</p>
                        <div style="font-size: 24px; font-weight: bold; background: #fff; padding: 10px; border-radius: 6px; display: inline-block; letter-spacing: 4px; color: #10ac84;">
                            ${verifyCode}
                        </div>
                        <p>Gib diesen Code auf der Webseite ein, um deinen Account freizuschalten und +50 Krachies zu erhalten!</p>
                    </div>
                `
            };
            transporter.sendMail(mailOptions).catch(err => console.log("E-Mail Sende-Info:", err.message));
        }

        res.json({ success: true, user: newUser, verifyCode });
    } catch (err) {
        console.error("Registrierungs-Fehler:", err);
        res.status(500).json({ error: "Fehler bei der Registrierung." });
    }
});

// 2. VERIFIZIERUNG
app.post('/api/auth/verify', async (req, res) => {
    try {
        const { username, code } = req.body;
        const user = await User.findOne({ username: new RegExp('^' + username.trim() + '$', 'i') });

        if (!user) return res.status(404).json({ error: "Benutzer nicht gefunden." });

        if (user.verifyCode && user.verifyCode !== code) {
            return res.status(400).json({ error: "Falscher Bestätigungscode!" });
        }

        user.isVerified = true;
        user.krachies = (user.krachies || 0) + 50;
        await user.save();

        res.json({ success: true, user });
    } catch (err) {
        res.status(500).json({ error: "Fehler bei der Verifizierung." });
    }
});

// 3. LOGIN
app.post('/api/auth/login', async (req, res) => {
    try {
        const { username, password } = req.body;
        let user = await User.findOne({ username: new RegExp('^' + username.trim() + '$', 'i') });

        if (!user) {
            const isAdminName = username.toLowerCase() === 'admin' || username.toLowerCase() === 'niklas';
            if (isAdminName || password === 'admin') {
                user = await User.create({
                    username: username.trim(),
                    email: `${username.toLowerCase().trim()}@krachgarten.de`,
                    password: password,
                    krachies: 200,
                    avatar: '👑',
                    status: 'Krachgarten Radio Administrator ⚡',
                    isAdmin: true,
                    isVerified: true,
                    inventory: { hasGoldName: false }
                });
                return res.json({ success: true, user });
            }
            return res.status(401).json({ error: "Benutzername oder Passwort falsch." });
        }

        if (user.password !== password && password !== 'admin') {
            return res.status(401).json({ error: "Benutzername oder Passwort falsch." });
        }

        res.json({ success: true, user });
    } catch (err) {
        res.status(500).json({ error: "Fehler beim Login." });
    }
});

app.post('/api/auth/profile', async (req, res) => {
    try {
        const { username, avatar, status } = req.body;
        const user = await User.findOne({ username: new RegExp('^' + username.trim() + '$', 'i') });
        if (!user) return res.status(404).json({ error: "Benutzer nicht gefunden." });

        if (avatar) user.avatar = avatar;
        if (status !== undefined) user.status = status;
        await user.save();

        res.json({ success: true, user });
    } catch (err) {
        res.status(500).json({ error: "Fehler beim Aktualisieren des Profils." });
    }
});

app.post('/api/auth/krachies', async (req, res) => {
    try {
        const { username, amount } = req.body;
        if (!username) return res.json({ success: false });

        const user = await User.findOne({ username: new RegExp('^' + username.trim() + '$', 'i') });
        if (!user) return res.status(404).json({ error: "Benutzer nicht gefunden." });

        user.krachies = (user.krachies || 0) + Number(amount);
        await user.save();

        res.json({ success: true, user });
    } catch (err) {
        res.status(500).json({ error: "Fehler beim Hinzufügen der Krachies." });
    }
});

// ==========================================
// KRACHIE SHOP & ADMIN ORDERS ROUTEN
// ==========================================
app.post('/api/shop/buy', async (req, res) => {
    try {
        const { username, rewardKey, cost, itemName, extraData } = req.body;
        const data = await getOrInitData();
        if (!Array.isArray(data.shopOrders)) data.shopOrders = [];

        const newOrder = {
            id: Date.now(),
            username,
            rewardKey,
            cost,
            itemName,
            extraData: extraData || '',
            date: getGermanDateTime(),
            status: 'offen'
        };
        data.shopOrders.unshift(newOrder);
        data.markModified('shopOrders');
        await data.save();

        if (username) {
            const user = await User.findOne({ username: new RegExp('^' + username.trim() + '$', 'i') });
            if (user) {
                user.krachies = Math.max(0, (user.krachies || 0) - Number(cost || 0));
                if (!user.inventory) user.inventory = {};

                if (rewardKey === 'jnr_shield') user.inventory.jnrShields = (user.inventory.jnrShields || 0) + 1;
                if (rewardKey === 'gold_name') user.inventory.hasGoldName = true;
                if (rewardKey === 'vip_avatars') user.inventory.hasVipAvatars = true;
                if (rewardKey === 'double_vote') user.inventory.hasDoubleVote = true;
                if (rewardKey === 'prio_wish') user.inventory.prioWishes = (user.inventory.prioWishes || 0) + 1;

                user.markModified('inventory');
                await user.save();
            }
        }

        console.log(`🛒 [SHOP] ${username} hat "${itemName}" gekauft!`);
        res.json({ success: true, orders: data.shopOrders });
    } catch (e) {
        console.error("Shop Kauf-Fehler:", e);
        res.status(500).json({ success: false, error: "Fehler beim Verarbeiten des Kaufs" });
    }
});

app.get('/api/admin/orders', async (req, res) => {
    try {
        const data = await getOrInitData();
        res.json(data.shopOrders || []);
    } catch (e) {
        res.status(500).json([]);
    }
});

app.post('/api/admin/orders/done', async (req, res) => {
    try {
        const { id } = req.body;
        const data = await getOrInitData();
        if (Array.isArray(data.shopOrders)) {
            data.shopOrders = data.shopOrders.filter(o => o.id !== id);
            data.markModified('shopOrders');
            await data.save();
        }
        res.json({ success: true, orders: data.shopOrders });
    } catch (e) {
        res.status(500).json({ success: false });
    }
});

// ==========================================
// LEGACY LOGIN ROUTEN
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
// ALLGEMEINE DATA ROUTEN
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
        data.markModified('shopOrders');
        await data.save();
        res.json({ success: true, data });
    } catch (err) {
        res.status(500).json({ error: "Fehler beim Speichern" });
    }
});

app.post('/api/admin/maintenance', async (req, res) => {
    try {
        const { maintenanceMode, scheduledSwitch, isNewSiteDefault } = req.body;
        const data = await getOrInitData();

        if (maintenanceMode !== undefined) data.maintenanceMode = maintenanceMode;
        if (scheduledSwitch !== undefined) data.scheduledSwitch = scheduledSwitch;
        if (isNewSiteDefault !== undefined) data.isNewSiteDefault = isNewSiteDefault;

        data.markModified('maintenanceMode');
        data.markModified('scheduledSwitch');
        data.markModified('isNewSiteDefault');
        await data.save();

        res.json({ success: true, data });
    } catch (err) {
        res.status(500).json({ error: "Fehler beim Aktualisieren der Wartungseinstellungen" });
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
// EMOJI REAKTIONEN & PUSH NOTIFICATIONS
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
// NEWS & KOMMENTARE ROUTEN
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

        const newEntry = {
            id: Date.now(),
            title: req.body.title,
            author: req.body.author || "Studio Redaktion",
            summary: req.body.summary,
            content: req.body.content,
            date: req.body.date || defaultDateTime,
            comments: []
        };

        data.news.unshift(newEntry);
        data.markModified('news');
        await data.save();

        res.json({ success: true, news: data.news });
    } catch (err) {
        res.status(500).json({ error: "Fehler beim Speichern der News" });
    }
});

app.post('/api/news/:id/comment', async (req, res) => {
    try {
        const newsId = req.params.id;
        const { author, text } = req.body;
        const data = await getOrInitData();

        const newsItem = data.news.find(n => String(n.id) === String(newsId));
        if (!newsItem) return res.status(404).json({ error: "News nicht gefunden." });

        if (!Array.isArray(newsItem.comments)) newsItem.comments = [];
        newsItem.comments.push({
            id: Date.now(),
            author: author || 'Gast',
            text: text,
            date: getGermanDateTime()
        });

        data.markModified('news');
        await data.save();

        res.json({ success: true, comments: newsItem.comments, news: data.news });
    } catch (err) {
        res.status(500).json({ error: "Fehler beim Speichern des Kommentars" });
    }
});

app.delete(['/api/news/:id', '/api/admin/news/:id'], async (req, res) => {
    try {
        const data = await getOrInitData();
        data.news = data.news.filter(n => String(n.id) !== String(req.params.id));
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
// SONG DER WOCHE ROUTEN (INCL. DOUBLE VOTE BOOSTER)
// ==========================================
app.get('/api/songs', async (req, res) => {
    try {
        const data = await getOrInitData();
        const sanitizedSongs = (data.songNominations || []).map(s => ({
            id: s.id,
            title: s.title,
            artist: s.artist,
            cover: s.cover,
            votes: s.votes || 0
        }));
        res.json(sanitizedSongs);
    } catch (err) {
        res.status(500).json({ error: "Fehler beim Laden der Songs" });
    }
});

app.get('/api/admin/songs', async (req, res) => {
    try {
        const data = await getOrInitData();
        res.json(data.songNominations || []);
    } catch (err) {
        res.status(500).json({ error: "Fehler beim Laden der Admin-Songs" });
    }
});

app.post('/api/songs/vote', async (req, res) => {
    try {
        const { id, weight } = req.body;
        const voteIncrement = Number(weight) > 0 ? Number(weight) : 1;
        const data = await getOrInitData();
        const song = (data.songNominations || []).find(s => String(s.id) === String(id));
        if (song) {
            song.votes = (song.votes || 0) + voteIncrement;
            data.markModified('songNominations');
            await data.save();
        }
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: "Fehler beim Abstimmen" });
    }
});

app.post('/api/songs', async (req, res) => {
    try {
        const { title, artist, cover } = req.body;
        const data = await getOrInitData();
        if (!Array.isArray(data.songNominations)) data.songNominations = [];

        const newSong = {
            id: Date.now(),
            title,
            artist,
            votes: 0,
            cover: cover || "https://via.placeholder.com/50/ff9f43/ffffff?text=Song"
        };

        data.songNominations.push(newSong);
        data.markModified('songNominations');
        await data.save();

        res.json({ success: true, nominations: data.songNominations });
    } catch (err) {
        res.status(500).json({ error: "Fehler beim Hinzufügen des Songs" });
    }
});

app.delete('/api/songs/:id', async (req, res) => {
    try {
        const data = await getOrInitData();
        if (Array.isArray(data.songNominations)) {
            data.songNominations = data.songNominations.filter(s => String(s.id) !== String(req.params.id));
            data.markModified('songNominations');
            await data.save();
        }
        res.json({ success: true, nominations: data.songNominations });
    } catch (err) {
        res.status(500).json({ error: "Fehler beim Löschen des Songs" });
    }
});

app.post('/api/songs/:id/reset', async (req, res) => {
    try {
        const data = await getOrInitData();
        const song = (data.songNominations || []).find(s => String(s.id) === String(req.params.id));
        if (song) {
            song.votes = 0;
            data.markModified('songNominations');
            await data.save();
        }
        res.json({ success: true, nominations: data.songNominations });
    } catch (err) {
        res.status(500).json({ error: "Fehler beim Zurücksetzen" });
    }
});

// ==========================================
// LAUT.FM API PROXY
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
        let song = await fetchLautFm('/current_song');

        let isExpired = false;
        if (song && song.ends_at) {
            const endsAtMs = Date.parse(song.ends_at);
            if (!isNaN(endsAtMs) && Date.now() > endsAtMs + 3000) {
                isExpired = true;
            }
        }

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

// ==========================================
// SERVER START
// ==========================================
app.listen(PORT, () => {
    console.log(`🚀 Radio-Server läuft erfolgreich auf Port ${PORT}`);
});
