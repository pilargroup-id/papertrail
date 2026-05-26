const bcrypt = require('bcryptjs');
const { centralDb } = require('../../db');
const { LOGIN_SQL } = require('../config/constants');

function rowsToSessionUser(rows) {
    if (!rows || rows.length === 0) return null;

    const base = rows[0];

    const assignments = rows
        .filter(row => row.company_id || row.dept_class || row.dept_name)
        .map(row => ({
            id: row.company_id,
            code: row.company_code,
            name: row.company_name,
            class: row.dept_class || row.dept_name,
            department_id: row.department_id,
            dept_name: row.dept_name,
            dept_class: row.dept_class,
            dept_code: row.dept_code,
            job_level_name: row.job_level_name,
            job_level_rank: row.job_level_rank,
            classes: row.dept_class ? [row.dept_class] : [],
        }));

    const isIT = assignments.some(a =>
        String(a.dept_class || a.class || '').toUpperCase() === 'IT'
    );

    const primaryAssignment = assignments[0] || {};

    return {
        id: base.id,
        username: base.username,
        email: base.email,
        fullName: base.name,
        name: base.name,
        role: isIT ? 'administrator' : 'user',

        companyId: primaryAssignment.id || null,
        companyCode: primaryAssignment.code || null,
        companyName: primaryAssignment.name || null,
        selectedCompany: primaryAssignment.name || null,

        departmentId: primaryAssignment.department_id || null,
        departmentCode: primaryAssignment.dept_code || null,
        departmentName: primaryAssignment.dept_name || null,
        departmentClass: primaryAssignment.dept_class || null,
        selectedDivision: primaryAssignment.dept_class || primaryAssignment.dept_name || null,

        jobLevelName: base.job_level_name || primaryAssignment.job_level_name || null,
        jobLevelRank: base.job_level_rank || primaryAssignment.job_level_rank || null,
        selectedJobLevel: base.job_level_name || primaryAssignment.job_level_name || null,

        allAssignments: assignments,
    };
}

async function devAuth(req, res, next) {
    const enabled =
        process.env.NODE_ENV !== 'production' &&
        process.env.DEV_AUTH_ENABLED === 'true';

    if (!enabled) return next();

    if (req.session && req.session.user) {
        res.locals.user = req.session.user;
        req.user = req.session.user;
        return next();
    }

    const username = process.env.DEV_AUTH_USERNAME;
    const password = process.env.DEV_AUTH_PASSWORD;

    if (!username || !password) {
        return res.status(500).json({
            error: 'DEV_AUTH_USERNAME and DEV_AUTH_PASSWORD are required in .env.local',
        });
    }

    try {
        const [rows] = await centralDb.query(LOGIN_SQL, [username]);

        if (!rows || rows.length === 0) {
            return res.status(401).json({
                error: 'Dev auth user not found in central_users',
                username,
            });
        }

        const passwordHash = rows[0].password || '';
        const validPassword = await bcrypt.compare(password, passwordHash);

        if (!validPassword) {
            return res.status(401).json({
                error: 'Invalid DEV_AUTH_PASSWORD',
                username,
            });
        }

        const user = rowsToSessionUser(rows);

        req.session.user = user;
        req.user = user;
        res.locals.user = user;

        return next();
    } catch (err) {
        return res.status(500).json({
            error: 'Dev auth failed',
            details: err.message,
        });
    }
}

module.exports = {
    devAuth,
    rowsToSessionUser,
};