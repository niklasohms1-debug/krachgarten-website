<!DOCTYPE html>
<html lang="de">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Admin Login | krachgarten</title>
    <style>
        body { font-family: 'Segoe UI', sans-serif; background: #121214; color: #fff; display: flex; justify-content: center; align-items: center; min-height: 100vh; margin: 0; }
        .login-card { background: #202024; padding: 30px; border-radius: 12px; border: 1px solid #29292e; max-width: 350px; width: 100%; text-align: center; }
        input { width: 100%; padding: 10px; margin: 15px 0; background: #121214; border: 1px solid #29292e; color: #fff; border-radius: 6px; box-sizing: border-box; }
        button { width: 100%; padding: 10px; background: #ff4757; border: none; color: #fff; font-weight: bold; border-radius: 6px; cursor: pointer; }
        button:hover { background: #e03e4d; }
        .error { color: #ff4757; font-size: 0.85rem; display: none; margin-top: 10px; }
    </style>
</head>
<body>
    <div class="login-card">
        <h2>🔒 Admin Login</h2>
        <p style="color: #a8a8b3; font-size: 0.9rem;">Zugang zur Vorschauseite</p>
        <input type="password" id="password" placeholder="Admin-Passwort eingeben">
        <button onclick="login()">Einloggen 🚀</button>
        <div id="error-msg" class="error">Falsches Passwort!</div>
    </div>

    <script>
        async function login() {
            const password = document.getElementById('password').value;
            const res = await fetch('/api/dev-login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ password })
            });

            if (res.ok) {
                // Erfolgreich -> weiterleiten zur neuen Baustelle
                window.location.href = '/index_neu.html';
            } else {
                document.getElementById('error-msg').style.display = 'block';
            }
        }
    </script>
</body>
</html>