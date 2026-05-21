const { sameCompanyName } = require('../utils/company');

/**
 * Checks if a FRP request is within the logged-in user's scope (company + division).
 */
function isRequestInUserScope(request, user) {
    if (user.role === 'administrator') return true;
    return sameCompanyName(request.companyName, user.selectedCompany) &&
           request.divisi === user.selectedDivision;
}

/**
 * Checks if an RP request is within the logged-in user's scope.
 * Optionally includes the "process division" for procurement checks.
 */
function isRpInUserScope(request, user, includeProcessDivision = false) {
    if (user.role === 'administrator') return true;
    if (!sameCompanyName(request.companyName, user.selectedCompany)) return false;
    return request.divisi === user.selectedDivision ||
           (includeProcessDivision && request.diprosesOleh === user.selectedDivision);
}

module.exports = { isRequestInUserScope, isRpInUserScope };
