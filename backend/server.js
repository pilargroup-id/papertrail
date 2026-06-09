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

app.use((req, res, next) => {
    const authHeader = req.headers.authorization || '';
    const bearerToken = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;
    const token = req.query.token || bearerToken;

    if (!token || req.session.user) {
        return next();
    }

    try {
        const decoded = jwt.decode(token);

        if (!decoded) {
            return next();
        }

        const allowedApps = Array.isArray(decoded.apps) ? decoded.apps : [];
        if (!allowedApps.includes('papertrail')) {
            return res.status(403).json({ error: 'Forbidden: papertrail access denied' });
        }

        req.session.user = {
            id: decoded.internal_id || decoded.sub || null,
            username: decoded.username || '',
            fullName: decoded.name || decoded.username || '',
            name: decoded.name || decoded.username || '',
            email: decoded.email || '',
            phone: decoded.phone || '',
            jobPosition: decoded.job_position || '',
            role: decoded.department === 'IT' ? 'administrator' : 'user',

            selectedCompany: decoded.company || '',
            selectedCompanyId: decoded.company_id || '',
            selectedCompanyCode: decoded.company_id || '',
            selectedDivision: decoded.department || '',
            selectedJobLevel: decoded.job_position || '',

            allAssignments: [
                {
                    id: decoded.company_id || '',
                    companyId: decoded.company_id || '',
                    companyCode: decoded.company_id || '',
                    name: decoded.company || '',
                    class: decoded.department || '',
                    jobLevel: decoded.job_position || '',
                },
            ],

            sso: true,
            apps: allowedApps,
        };

        req.session.save(() => next());
    } catch (err) {
        console.error('[SSO Token Error]', err.message);
        next();
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
