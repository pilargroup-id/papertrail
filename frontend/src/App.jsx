import React from 'react'
import { Routes, Route } from 'react-router-dom'
import BackgroundMain from './components/template/BackgroundMain'
import { UserProvider } from './contexts/UserContext'
import DashboardLayout from './components/template/DashboardLayout'
import LoginPage from './pages/LoginPage'
import SelectCompanyPage from './pages/SelectCompanyPage'
import SelectDivisionPage from './pages/SelectDivisionPage'
import ChoicePage from './pages/ChoicePage'
import NewFRP from './pages/frp/NewFRP'
import ApprovalPage from './pages/frp/ApprovalPage'
import AdminPage from './pages/AdminPage'
import FrpDetailPage from './pages/frp/FrpDetailPage'
import DashboardPage from './pages/dashboard/DashboardPage'
import ReportPage from './pages/report/ReportPage'
import NewRP from './pages/rp/NewRP'
import RpApprovalPage from './pages/rp/RpApprovalPage'
import StatusFRP from './pages/frp/StatusFRP'
import StatusRP from './pages/rp/StatusRP'
import DocumentPage from './pages/document/DocumentPage'

export default function App() {
  return (
    <>
      <BackgroundMain />
      <UserProvider>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/frp/:id" element={<FrpDetailPage />} />
          <Route element={<DashboardLayout />}>
            <Route path="/select-company" element={<SelectCompanyPage />} />
            <Route path="/select-division" element={<SelectDivisionPage />} />
            <Route path="/" element={<NewFRP />} />
            <Route path="/frp" element={<NewFRP />} />
            <Route path="/approval" element={<ApprovalPage />} />
            <Route path="/approved" element={<ApprovalPage />} />
            <Route path="/dashboard" element={<DashboardPage />} />
            <Route path="/laporan" element={<ReportPage />} />
            <Route path="/admin/:type" element={<AdminPage />} />
            <Route path="/rp" element={<NewRP />} />
            <Route path="/rp-approval" element={<RpApprovalPage />} />
            <Route path="/rp-approved" element={<RpApprovalPage />} />
            <Route path="/status_frp" element={<StatusFRP />} />
            <Route path="/status_rp" element={<StatusRP />} />
            <Route path="/document/generate" element={<DocumentPage view="form" />} />
            <Route path="/document/riwayat" element={<DocumentPage view="history" />} />
            <Route path="/document/template" element={<DocumentPage view="templates" />} />
          </Route>
        </Routes>
      </UserProvider>
    </>
  )
}
