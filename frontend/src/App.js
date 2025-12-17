import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';

// Страницы
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import Boards from './pages/Boards';
import BoardView from './pages/BoardView';
import Habits from './pages/Habits';
import Stats from './pages/Stats';
import Achievements from './pages/Achievements';

// Компоненты
import Navbar from './components/Navbar';

// API
import api from './api/api';
import { initializeSocket, disconnectSocket } from './socket/socket';

function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    const token = localStorage.getItem('token');
    if (token) {
      try {
        const response = await api.get('/auth/me');
        setUser(response.data.data);
        initializeSocket(token);
      } catch (error) {
        localStorage.removeItem('token');
      }
    }
    setLoading(false);
  };

  const handleLogin = (userData, token) => {
    localStorage.setItem('token', token);
    setUser(userData);
    initializeSocket(token);
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    setUser(null);
    disconnectSocket();
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <div>Загрузка...</div>
      </div>
    );
  }

  return (
    <Router>
      <div className="App">
        {user && <Navbar user={user} onLogout={handleLogout} />}
        
        <Routes>
          <Route 
            path="/login" 
            element={user? <Navigate to="/dashboard" />: <Login onLogin={handleLogin} />} 
          />
          <Route 
            path="/register" 
            element={user? <Navigate to="/dashboard" />: <Register onLogin={handleLogin} />} 
          />
          
          <Route 
            path="/dashboard" 
            element={user? <Dashboard user={user} />: <Navigate to="/login" />} 
          />
          <Route 
            path="/boards" 
            element={user? <Boards user={user} />: <Navigate to="/login" />} 
          />
          <Route 
            path="/boards/:id" 
            element={user? <BoardView user={user} />: <Navigate to="/login" />} 
          />
          <Route 
            path="/habits" 
            element={user? <Habits user={user} />: <Navigate to="/login" />} 
          />
          <Route 
            path="/stats" 
            element={user? <Stats user={user} />: <Navigate to="/login" />} 
          />
          <Route 
            path="/achievements" 
            element={user? <Achievements user={user} />: <Navigate to="/login" />} 
          />
          
          <Route path="/" element={<Navigate to={user? "/dashboard": "/login"} />} />
        </Routes>

        <Toaster position="top-right" />
      </div>
    </Router>
  );
}

export default App;