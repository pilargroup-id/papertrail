import { Routes, Route } from 'react-router-dom';

import AppLayout from '../layouts/AppLayout';

import ChartTemplatePage from '../pages/ChartTemplatePage.jsx';
import TableTemplatePage from '../pages/TableTemplatePage.jsx';

// pages
import Page1 from '../pages/page1/Page1.jsx';
import Page2 from '../pages/page2/Page2.jsx';
import Page3 from '../pages/page3/Page3.jsx';

// =========MASTER PAGES=========

// Vendor Management
import VendorPage from '../pages/master/vendors/vendor/VendorPage.jsx';
import BanksPage from '../pages/master/vendors/banks/BanksPage.jsx';
import VendorBanksPage from '../pages/master/vendors/vendors-banks-account/VendorBanksAccountPage.jsx';

// Budget Management
import BudgetPages from '../pages/master/budgets/budget/BudgetPage.jsx';
import BudgetTypePage from '../pages/master/budgets/budget-type/BudgetTypePage.jsx';
import BudgetAccessPage from '../pages/master/budgets/budget-access/BudgetAccessPage.jsx';

// Document Management
import FrpDocumentsType from '../pages/master/document-setting/frp-document-types/FrpDocumentsType.jsx';
import ExternalDocumentTypes from '../pages/master/document-setting/external-document-types/ExternalDocumentTypes.jsx';
import PaymentMethods from '../pages/master/document-setting/payment-methods/PaymentMethods.jsx';

// Config
import RpDestinationsDepartments from '../pages/master/config/rp-destination-departments/RpDestinationsDepartments.jsx';
import RpCheckerRules from '../pages/master/config/rp-checker-rules/RpCheckerRules.jsx';
import RpPaymentCategories from '../pages/master/config/rp-payment-categories/RpPaymentCategories.jsx';

// Permission
import PermissionModules from '../pages/master/permission/permission-modules/PermissionModules.jsx';

import IconsPage from '../pages/icons/IconsPage.jsx';
import FormsPage from '../pages/forms/FormsPage.jsx';

export default function RouteConfig() {
  return (
    <Routes>
      <Route element={<AppLayout />}>
        <Route index element={<Page1 />} />
        <Route path="Page1" element={<Page1 />} />
        <Route path="Page2" element={<Page2 />} />
        <Route path="Page3" element={<Page3 />} />
        <Route path="Table" element={<TableTemplatePage />} />
        <Route path="Table" element={<TableTemplatePage />} />
        <Route path="TableActions" element={<TableTemplatePage />} />
        <Route path="users" element={<TableTemplatePage />} />
        <Route path="Chart" element={<ChartTemplatePage />} />
        <Route path="forms" element={<FormsPage />} />
        <Route path="Forms" element={<FormsPage />} />
        <Route path="icons" element={<IconsPage />} />

        {/* master pages */}

        {/* Vendor Management */}
        <Route path="Master/Vendor" element={<VendorPage />} />
        <Route path="Master/Banks" element={<BanksPage />} />
        <Route path="Master/VendorBanksAccount" element={<VendorBanksPage />} />
        {/* Budget Management */}
        <Route path="Master/Budgets" element={<BudgetPages />} />
        <Route path="Master/Budget-type" element={<BudgetTypePage/>} />
        <Route path="Master/Budget-access" element={<BudgetAccessPage/>} />
        {/* Documents Management  */}
        <Route path="Master/Frp-docs-type" element={<FrpDocumentsType/>} />
        <Route path="Master/External-document-Types" element={<ExternalDocumentTypes/>} />
        <Route path="Master/Payment-methods" element={<PaymentMethods/>} />
        {/* Config */}
        <Route path="Master/Rp-destination-departments" element={<RpDestinationsDepartments/>} />
        <Route path="Master/Rp-checker-rules" element={<RpCheckerRules/>} />
        <Route path="Master/Rp-payment-categories" element={<RpPaymentCategories/>} />
        {/* Permission */}
        <Route path="Master/permission-modules" element={<PermissionModules/>} />

      </Route>
    </Routes>
  );
}
