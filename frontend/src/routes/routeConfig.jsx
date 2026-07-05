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

      </Route>
    </Routes>
  );
}
