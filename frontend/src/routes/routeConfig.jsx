import { Routes, Route, Navigate } from 'react-router-dom';

import AppLayout from '../layouts/AppLayout';

// =========MASTER PAGES=========
// frp
import FrpPage from '../pages/frp/FrpPage.jsx';
import ConvertFrpFromRp from '../pages/frp/ConvertFrpFromRp.jsx';
// rp
import RpPage from '../pages/rp/RpPage.jsx';

// Vendor Management
import VendorPage from '../pages/master/vendors/vendor/VendorPage.jsx';
import BanksPage from '../pages/master/vendors/banks/BanksPage.jsx';
import VendorBanksPage from '../pages/master/vendors/vendors-banks-account/VendorBanksAccountPage.jsx';

// Budget Management
import BudgetPages from '../pages/master/budgets/budget/BudgetPage.jsx';
import BudgetTypePage from '../pages/master/budgets/budget-type/BudgetTypePage.jsx';
import BudgetAccessPage from '../pages/master/budgets/budget-access/BudgetAccessPage.jsx';
import CurrenciesPage from '../pages/master/budgets/currencies/CurrenciesPage.jsx';

// Document Management
import FrpDocumentsType from '../pages/master/document-setting/frp-document-types/FrpDocumentsType.jsx';
import ExternalDocumentTypes from '../pages/master/document-setting/external-document-types/ExternalDocumentTypes.jsx';
import PaymentMethods from '../pages/master/document-setting/payment-methods/PaymentMethods.jsx';

// Config
// import RpDestinationsDepartments from '../pages/master/config/rp-destination-departments/RpDestinationsDepartments.jsx';
// import RpCheckerRules from '../pages/master/config/rp-checker-rules/RpCheckerRules.jsx';
import RpPaymentCategories from '../pages/master/config/rp-payment-categories/RpPaymentCategories.jsx';

// Permission
import PermissionModules from '../pages/master/permission/permission-modules/PermissionModules.jsx';

import FormsPage from '../pages/forms/FormsPage.jsx';

// Logs Pages
import LogsPages from '../pages/logs/LogsPages.jsx';

export default function RouteConfig() {
  return (
    <Routes>
      <Route element={<AppLayout />}>
        <Route index element={<Navigate to="frp" replace />} />
        <Route path="forms" element={<FormsPage />} />
        <Route path="Forms" element={<FormsPage />} />

        <Route path="frp" element={<FrpPage />} />
        <Route path="rp" element={<RpPage />} />
        <Route path="Rp" element={<RpPage />} />
        <Route path="Create" element={<RpPage />} />
        <Route path="rp-to-frp" element={<ConvertFrpFromRp />} />

        {/* master pages */}

        {/* Vendor Management */}
        <Route path="Master/Vendor" element={<VendorPage />} />
        <Route path="Master/Banks" element={<BanksPage />} />
        <Route path="Master/VendorBanksAccount" element={<VendorBanksPage />} />
        {/* Budget Management */}
        <Route path="Master/Budgets" element={<BudgetPages />} />
        <Route path="Master/Budget-type" element={<BudgetTypePage/>} />
        <Route path="Master/Budget-access" element={<BudgetAccessPage/>} />
        <Route path="Master/Currencies" element={<CurrenciesPage/>} />
        {/* Documents Management  */}
        <Route path="Master/Frp-docs-type" element={<FrpDocumentsType/>} />
        <Route path="Master/External-document-Types" element={<ExternalDocumentTypes/>} />
        <Route path="Master/Payment-methods" element={<PaymentMethods/>} />
        {/* Config */}
        {/* <Route path="Master/Rp-destination-departments" element={<RpDestinationsDepartments/>} />
        <Route path="Master/Rp-checker-rules" element={<RpCheckerRules/>} /> */}
        <Route path="Master/Rp-payment-categories" element={<RpPaymentCategories/>} />
        {/* Permission */}
        <Route path="Master/permission-modules" element={<PermissionModules/>} />
        {/* Logs */}
        <Route path="Logs" element={<LogsPages/>} />
      </Route>
    </Routes>
  );
}
