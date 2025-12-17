import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import '../styles/Navbar.css';

function Navbar({ user, onLogout }) {
  const location = useLocation();

  const isActive = (path) => {
    return location.pathname === path? 'active': '';
  };

  return (
    <nav className="navbar">
      <div className="container navbar-content">
        <div className="navbar-brand">
          <Link to="/dashboard">
            <span className="brand-icon">🎯</span>
            <span className="brand-text">Трекер Привычек</span>
          </Link>
        </div>

        <div className="navbar-links">
          <Link to="/dashboard" className={`nav-link ${isActive('/dashboard')}`}>
            📊 Дашборд
          </Link>
          <Link to="/habits" className={`nav-link ${isActive('/habits')}`}>
            🎯 Привычки
          </Link>
          <Link to="/boards" className={`nav-link ${isActive('/boards')}`}>
            📋 Доски
          </Link>
          <Link to="/stats" className={`nav-link ${isActive('/stats')}`}>
            📈 Статистика
          </Link>
          <Link to="/achievements" className={`nav-link ${isActive('/achievements')}`}>
            🏆 Достижения
          </Link>
        </div>

        <div className="navbar-user">
          <div className="user-info">
            <span className="user-name">{user.username}</span>
            <span className="user-level">Уровень {user.level}</span>
            <span className="user-points">⭐ {user.total_points}</span>
          </div>
          <button onClick={onLogout} className="btn btn-danger btn-sm">
            Выход
          </button>
        </div>
      </div>
    </nav>
  );
}

export default Navbar;