const express = require('express');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;
const DATA_FILE = path.join(__dirname, 'data.json');
const ICECAST_JSON_URL = 'http://localhost:8000/status-json.xsl';

// ==========================================
// ZUGANGSDATEN (FEST GELEGT)
// ==========================================
const ADMIN_USER = "admin";
const ADMIN_PASS = "katzi123";

const DJ_USER = "dj";
const DJ_PASS = "djpass123";

// Middleware
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Hilfsfunktionen für JSON-Datei
const readData = () => {
    try {
        if (!fs.existsSync(DATA_FILE)) {
            const initialData = {
                streamName: "KRACHGARTEN",
                currentTitle: "Live Stream",
                passwords: { admin: ADMIN_PASS, dj: DJ_PASS },
                wishes: [],
                team: [],
                news: [],
                schedule: []
            };
            fs.writeFileSync(DATA_FILE, JSON.stringify(initialData, null, 2));
            return initialData;
        }
        return JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
    } catch (e) {
        console.error("Fehler beim Lesen der data.json:", e);
        return { streamName: "KRACHGARTEN", currentTitle: "Live Stream", wishes: [], team: [], news: [], schedule: [] };
    }
};

const writeData = (data) => {
    try {
        fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
    } catch (e) {
        console.error("Fehler beim Schreiben der data.json:", e);
    }
};

// Icecast Titel-Sync im Hintergrund
async function updateCurrentTitleFromIcecast() {
    try {
        const response = await fetch(ICECAST_JSON_URL);
        if (!response.ok) return;
        const icecastData = await response.json();
        let source = icecastData.icestats.source;
        if (Array.isArray(source)) source = source[0];

        if (source && source.title) {
            const data = readData();
            if (data.currentTitle !== source.title) {
                data.currentTitle = source.title;
                writeData(data);
            }
        }
    } catch (e) {}
}
setInterval(updateCurrentTitleFromIcecast, 3000);

// ==========================================
// API ENDPUNKTE
// ==========================================

// 1. Öffentliche Daten (Homepage & Panels)
app.get('/api/data', (req, res) => res.json(readData()));

// 2. Wunsch/Gruß von der Homepage
app.post('/api/wish', (req, res) => {
    const { type, name, song, message } = req.body;
    if (!name) return res.status(400).json({ error: "Name ist ein Pflichtfeld!" });

    const data = readData();
    const newWish = {
        id: Date.now(),
        time: new Date().toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' }),
        type: type || "Musikwunsch",
        name,
        song: song || "-",
        message: message || "Keine Nachricht"
    };

    if (!data.wishes) data.wishes = [];
    data.wishes.unshift(newWish);
    writeData(data);
    res.json({ success: true, message: "Eintrag erfolgreich gesendet!" });
});

// 3. LOGIN ENDPUNKTE
// Admin Login (Benutzername & Passwort)
app.post('/api/admin/login', (req, res) => {
    const { username, password } = req.body;
    const data = readData();
    const validPass = (data.passwords && data.passwords.admin) ? data.passwords.admin : ADMIN_PASS;

    if (username === ADMIN_USER && (password === validPass || password === ADMIN_PASS)) {
        return res.json({ success: true, message: "Admin Login erfolgreich!" });
    }
    return res.status(401).json({ success: false, message: "Zugangsdaten falsch!" });
});

// DJ Login (Benutzername & Passwort)
app.post('/api/dj/login', (req, res) => {
    const { username, password } = req.body;
    const data = readData();
    const validPass = (data.passwords && data.passwords.dj) ? data.passwords.dj : DJ_PASS;

    if (username === DJ_USER && (password === validPass || password === DJ_PASS)) {
        return res.json({ success: true, message: "DJ Login erfolgreich!" });
    }
    return res.status(401).json({ success: false, message: "Zugangsdaten falsch!" });
});

// Allgemeine Login-Prüfung (nur Passwort)
app.post('/api/login', (req, res) => {
    const { password, role } = req.body;
    const data = readData();
    const validPassword = role === 'admin' ? (data.passwords?.admin || ADMIN_PASS) : (data.passwords?.dj || DJ_PASS);

    if (password === validPassword) {
        res.json({ success: true });
    } else {
        res.status(401).json({ success: false, message: "Falsches Passwort!" });
    }
});

// 4. TEAM ROUTEN
// Teammitglied hinzufügen
app.post('/api/admin/team', (req, res) => {
    const { name, role, department } = req.body;
    const data = readData();

    const newMember = { id: Date.now(), name, role, department };
    if (!data.team) data.team = [];
    data.team.push(newMember);

    writeData(data);
    res.json({ success: true, message: "Mitglied hinzugefügt!" });
});

// Teammitglied löschen
app.delete('/api/admin/team/:id', (req, res) => {
    const data = readData();
    const id = parseInt(req.params.id);

    if (data.team) {
        data.team = data.team.filter(m => m.id !== id);
    }

    writeData(data);
    res.json({ success: true, message: "Mitglied gelöscht!" });
});

// 5. EINSTELLUNGEN & NEWS
// Einstellungen ändern (Admin)
app.post('/api/settings', (req, res) => {
    const { streamName, currentTitle } = req.body;
    const data = readData();
    
    if (streamName) data.streamName = streamName;
    if (currentTitle) data.currentTitle = currentTitle;
    
    writeData(data);
    res.json({ success: true, message: "Einstellungen gespeichert!" });
});

// News schreiben (Admin)
app.post('/api/news', (req, res) => {
    const { title, text } = req.body;
    const data = readData();
    
    const newArticle = {
        id: Date.now(),
        date: new Date().toLocaleDateString('de-DE', { day: '2-digit', month: 'short', year: 'numeric' }),
        title,
        text
    };
    
    if (!data.news) data.news = [];
    data.news.unshift(newArticle);
    writeData(data);
    res.json({ success: true, message: "Artikel veröffentlicht!" });
});

// 6. DJ ROUTEN
app.post('/api/dj/title', (req, res) => {
    const { currentTitle } = req.body;
    const data = readData();

    data.currentTitle = currentTitle;
    writeData(data);
    res.json({ success: true, message: "Sendungstitel aktualisiert!" });
});

app.post('/api/dj/schedule', (req, res) => {
    const { time, show, djName } = req.body;
    const data = readData();

    if (!data.schedule) data.schedule = [];
    data.schedule.push({ time, show: `${show} (mit ${djName})` });
    writeData(data);
    res.json({ success: true, message: "Eintrag im Sendeplan gespeichert!" });
});

// ==========================================
// SERVER STARTEN
// ==========================================
app.listen(PORT, () => {
    console.log(`Radio-Website: http://localhost:${PORT}`);
    console.log(`DJ-Panel:      http://localhost:${PORT}/dj.html`);
    console.log(`Admin-Panel:   http://localhost:${PORT}/admin.html`);
});
