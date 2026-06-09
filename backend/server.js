// ============================================================
// FRP Backend — Entry Point
// ============================================================
// Struktur modul:
//   src/config/       — Konstanta & SQL templates
//   src/utils/        — Helper functions (json, company, appShell)
//   src/services/     — Database service layer
//   src/middleware/   — Auth, IT check, scope guards
//   src/routes/       — Route handlers per fitur
// ============================================================

require('dotenv').config({
    path: process.env.NODE_ENV === 'production' ? '.env' : '.env.local'
});
const { devAuth } = require('./src/middleware/devAuth');
const express = require('express');
const path = require('path');
const session = require('express-session');

// --- Routes ---
const authRoutes      = require('./src/routes/auth');
const frpRoutes       = require('./src/routes/frp');
const rpRoutes        = require('./src/routes/rp');
const adminRoutes     = require('./src/routes/admin');
const laporanRoutes   = require('./src/routes/laporan');
const dashboardRoutes = require('./src/routes/dashboard');
const pdfRoutes       = require('./src/routes/pdf');
const budgetRoutes    = require('./src/routes/budget');
const documentRoutes  = require('./src/routes/document');

const app  = express();
const PORT = process.env.PORT || 3000;
const IS_DEV = process.env.NODE_ENV !== 'production';

const frontendPath = path.join(__dirname, '..', 'frontend');
const pdfPath      = path.join(__dirname, 'generated-pdfs');
const { centralDb } = require('./db');
const { LOGIN_SQL } = require('./src/config/constants');
const { userFromLoginRows } = require('./src/services/dbService');
const jwt = require('jsonwebtoken');

// ============================================================
// STATIC FILES
// ============================================================
app.use(express.static(path.join(frontendPath, 'dist')));
app.use(express.static(path.join(frontendPath, 'public')));
app.use('/pdfs', express.static(pdfPath));
app.set('view cache', false);
app.set('trust proxy', 1);

// ============================================================
// BODY PARSERS
// ============================================================
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ============================================================
// SESSION
// ============================================================
app.use(session({
    secret: process.env.SESSION_SECRET || 'frp-secret-key-2024',
    resave: false,
    saveUninitialized: false,
    cookie: {
        maxAge: 24 * 60 * 60 * 1000, // 24 hours
        sameSite: process.env.SESSION_SAMESITE || (IS_DEV ? 'lax' : 'none'),
        secure: process.env.SESSION_SECURE
            ? process.env.SESSION_SECURE === 'true'
            : !IS_DEV,
    },
}));

app.use(devAuth);

app.use(async (req, res, next) => {
    const authHeader = req.headers.authorization || '';
    const bearerToken = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;
    const token = req.query.token || bearerToken;

    if (!token) {
        return next();
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);

        const allowedApps = Array.isArray(decoded.apps) ? decoded.apps : [];
        if (!allowedApps.includes('papertrail')) {
            return res.status(403).json({ error: 'Forbidden: papertrail access denied' });
        }

        // Kalau session sudah ada, tetap cek token_version supaya logout pusat kebaca
        if (req.session.user) {
            const [versionRows] = await centralDb.query(
                'SELECT token_version FROM central_users WHERE id = ? AND is_active = 1 LIMIT 1',
                [decoded.sub]
            );

            const currentVersion = Number(versionRows?.[0]?.token_version ?? -1);
            const tokenVersion = Number(decoded.cv ?? -2);

            if (currentVersion !== tokenVersion) {
                req.session.destroy(() => {});
                return res.status(401).json({ error: 'Token expired' });
            }

            return next();
        }

        const username = decoded.username;
        if (!username) {
            return res.status(401).json({ error: 'Invalid token payload' });
        }

        const [rows] = await centralDb.query(LOGIN_SQL, [username]);

        if (!rows.length) {
            return res.status(401).json({ error: 'User not found in central database' });
        }

        const currentVersion = Number(rows[0].token_version ?? -1);
        const tokenVersion = Number(decoded.cv ?? -2);

        if (currentVersion !== tokenVersion) {
            return res.status(401).json({ error: 'Token expired' });
        }

        const user = userFromLoginRows(rows);

        if (!user) {
            return res.status(401).json({ error: 'Failed to build user session' });
        }

        req.session.user = {
            ...user,
            sso: true,
            apps: allowedApps,
        };

        req.session.save((err) => {
            if (err) {
                console.error('Failed to save SSO session:', err);
                return res.status(500).json({ error: 'Failed to save session' });
            }

            return next();
        });
    } catch (error) {
        console.error('SSO token error:', error.message);

        if (req.path.startsWith('/api/')) {
            return res.status(401).json({ error: 'Unauthorized' });
        }

        return res.redirect('/');
    }
});

app.get('/api/dev/auth-user', (req, res) => {
    res.json({
        devAuthEnabled: process.env.DEV_AUTH_ENABLED === 'true',
        user: req.session.user || null,
    });
});

// ============================================================
// SPA HELPER — injects res.sendSPA() for all routes to use
// ============================================================
app.use((req, res, next) => {
    res.sendSPA = () => res.sendFile(path.join(frontendPath, 'dist', 'index.html'));
    next();
});

// ============================================================
// ROUTES
// ============================================================
app.use(authRoutes);
app.use(frpRoutes);
app.use(rpRoutes);
app.use(adminRoutes);
app.use(laporanRoutes);
app.use(dashboardRoutes);
app.use(pdfRoutes);
app.use(budgetRoutes);
app.use(documentRoutes);
if (!IS_DEV) {
    app.use((req, res, next) => {
        if (req.method !== 'GET') return next();
        if (req.path.startsWith('/api/') || req.path.startsWith('/pdfs/')) return next();
        if (!req.accepts('html')) return next();

        return res.sendFile(path.join(frontendPath, 'dist', 'index.html'));
    });
}
// ============================================================
// DEV MODE — Proxy ke Vite untuk HMR (Hot Module Replacement)
// ============================================================
if (IS_DEV) {
    const { createProxyMiddleware } = require('http-proxy-middleware');
    const viteProxy = createProxyMiddleware({
        target: 'http://localhost:5173',
        changeOrigin: true,
        ws: true, // penting untuk WebSocket HMR
        on: {
            error: (err, req, res) => {
                // Fallback ke dist jika Vite tidak berjalan
                if (res.sendFile) {
                    res.sendFile(path.join(frontendPath, 'dist', 'index.html'));
                }
            },
        },
    });
    app.use('/', viteProxy);
}

// ============================================================
// START SERVER
// ============================================================
const server = app.listen(PORT, '0.0.0.0', () => {
    const os   = require('os');
    const nets = os.networkInterfaces();
    const localIPs = Object.values(nets)
        .flat()
        .filter(n => n.family === 'IPv4' && !n.internal)
        .map(n => n.address);

    console.log(`\n FRP Backend running:`);
    console.log(`   Local:   http://localhost:${PORT}`);
    localIPs.forEach(ip => console.log(`   Network: http://${ip}:${PORT}`));
    if (IS_DEV) console.log(`   Mode:    DEV (proxy HMR → Vite :5173)`);
    console.log('');
});

// Forward WebSocket upgrade untuk HMR
if (IS_DEV) {
    server.on('upgrade', (req, socket, head) => {
        const { createProxyMiddleware } = require('http-proxy-middleware');
        const wsProxy = createProxyMiddleware({ target: 'http://localhost:5173', ws: true });
        wsProxy.upgrade(req, socket, head);
    });
}
// Restart trigger
