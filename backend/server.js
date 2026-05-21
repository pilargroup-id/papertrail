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

const app  = express();
const PORT = process.env.PORT || 3000;

const frontendPath = path.join(__dirname, '..', 'frontend');
const pdfPath      = path.join(__dirname, 'generated-pdfs');

// ============================================================
// STATIC FILES
// ============================================================
app.use(express.static(path.join(frontendPath, 'dist')));
app.use(express.static(path.join(frontendPath, 'public')));
app.use('/pdfs', express.static(pdfPath));
app.set('view cache', false);

// ============================================================
// BODY PARSERS
// ============================================================
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ============================================================
// SESSION
// ============================================================
app.use(session({
    secret: 'frp-secret-key-2024',
    resave: false,
    saveUninitialized: false,
    cookie: { maxAge: 24 * 60 * 60 * 1000 }, // 24 hours
}));

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

// ============================================================
// START SERVER
// ============================================================
app.listen(PORT, '0.0.0.0', () => {
    const os   = require('os');
    const nets = os.networkInterfaces();
    const localIPs = Object.values(nets)
        .flat()
        .filter(n => n.family === 'IPv4' && !n.internal)
        .map(n => n.address);

    console.log(`\n FRP Backend running:`);
    console.log(`   Local:   http://localhost:${PORT}`);
    localIPs.forEach(ip => console.log(`   Network: http://${ip}:${PORT}`));
    console.log('');
});
