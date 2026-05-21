/**
 * Middleware: Verifies user is logged in.
 * Also enforces company & division selection if user has multiple options.
 */
const checkAuth = (req, res, next) => {
    if (!req.session.user) {
        if (req.path.startsWith('/api/')) {
            return res.status(401).json({ error: 'Unauthorized', redirect: '/login' });
        }
        return res.redirect('/login');
    }

    const u = req.session.user;
    const isExempt = [
        '/select-company',
        '/select-division',
        '/logout',
        '/api/auth/select-company',
        '/api/auth/select-division',
        '/api/data/select-company',
        '/api/data/select-division',
    ].includes(req.path);

    if (!isExempt) {
        if (Array.isArray(u.allAssignments) && u.allAssignments.length > 0) {
            const uniqueCompanies = [...new Set(u.allAssignments.map(a => a.name))];

            if (!u.selectedCompany && uniqueCompanies.length > 1) {
                if (req.path.startsWith('/api/')) {
                    return res.status(401).json({ error: 'Unauthorized', redirect: '/select-company' });
                }
                return res.redirect('/select-company');
            }

            const divisions = u.allAssignments
                .filter(a => a.name === (u.selectedCompany || uniqueCompanies[0]))
                .flatMap(a => a.classes && a.classes.length > 0 ? a.classes : [a.class].filter(Boolean));

            if (!u.selectedDivision && divisions.length > 1) {
                if (req.path.startsWith('/api/')) {
                    return res.status(401).json({ error: 'Unauthorized', redirect: '/select-division' });
                }
                return res.redirect('/select-division');
            }
        }
    }

    res.locals.user = req.session.user;
    next();
};

/**
 * Middleware: Verifies user has administrator (IT) role.
 */
const checkIT = (req, res, next) => {
    if (!req.session.user || req.session.user.role !== 'administrator') {
        return res.status(403).json({ error: 'Forbidden' });
    }
    next();
};

/**
 * Middleware: Verifies user is admin or belongs to an IT division.
 */
const checkLaporan = (req, res, next) => {
    const u = req.session.user;
    const isIT = u && (u.allAssignments || []).some(a => a.class === 'IT');
    if (!u || (u.role !== 'administrator' && !isIT)) {
        return res.status(403).json({ error: 'Forbidden' });
    }
    next();
};

module.exports = { checkAuth, checkIT, checkLaporan };
