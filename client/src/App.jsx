import { Routes, Route, Navigate } from 'react-router-dom';
import Login from './pages/Login.jsx';
import Dashboard from './pages/Dashboard.jsx';
import Users from './pages/admin/Users.jsx';
import Announcements from './pages/Announcements.jsx';
import CreateAnnouncement from './pages/announcements/Create.jsx';
import EditAnnouncement from './pages/announcements/Edit.jsx';
import ManagePage from './pages/announcements/ManagePage.jsx';
import TvDisplay from './pages/TvDisplay.jsx';
import Gallery from './pages/Gallery.jsx';
import Upload from './pages/gallery/Upload.jsx';
import MyUploads from './pages/gallery/MyUploads.jsx';
import Moderation from './pages/admin/Moderation.jsx';
import AuditLogs from './pages/admin/AuditLogs.jsx';
import ProtectedRoute from './components/ProtectedRoute.jsx';

const App = () => {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/" element={<Navigate to="/login" replace />} />
      <Route
        path="/dashboard"
        element={
          <ProtectedRoute>
            <Dashboard />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/users"
        element={
          <ProtectedRoute roles={['admin']}>
            <Users />
          </ProtectedRoute>
        }
      />
      <Route
        path="/announcements"
        element={
          <ProtectedRoute>
            <Announcements />
          </ProtectedRoute>
        }
      />
      <Route
        path="/announcements/create"
        element={
          <ProtectedRoute roles={['teacher', 'admin']}>
            <CreateAnnouncement />
          </ProtectedRoute>
        }
      />
      <Route
        path="/announcements/:id/edit"
        element={
          <ProtectedRoute roles={['teacher', 'admin']}>
            <EditAnnouncement />
          </ProtectedRoute>
        }
      />
      <Route
        path="/announcements/manage"
        element={
          <ProtectedRoute roles={['teacher', 'admin']}>
            <ManagePage />
          </ProtectedRoute>
        }
      />
      <Route path="/tv" element={<TvDisplay />} />
      <Route path="/gallery" element={<Gallery />} />
      <Route
        path="/gallery/upload"
        element={
          <ProtectedRoute roles={['student', 'teacher', 'admin']}>
            <Upload />
          </ProtectedRoute>
        }
      />
      <Route
        path="/gallery/mine"
        element={
          <ProtectedRoute>
            <MyUploads />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/moderation"
        element={
          <ProtectedRoute roles={['admin']}>
            <Moderation />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/audit-logs"
        element={
          <ProtectedRoute roles={['admin']}>
            <AuditLogs />
          </ProtectedRoute>
        }
      />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
};

export default App;