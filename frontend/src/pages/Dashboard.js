import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../api/api';
import { on } from '../socket/socket';
import '../styles/Dashboard.css';

function Dashboard({ user }) {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadStats();

    // Подписываемся на события
    const unsubscribeAchievement = on('achievement_unlocked', () => {
      loadStats();
    });

    const unsubscribeLevelUp = on('level_up', () => {
      loadStats();
    });

    return () => {
      unsubscribeAchievement();
      unsubscribeLevelUp();
    };
  }, []);

  const loadStats = async () => {
    try {
      const response = await api.get('/user/stats');
      setStats(response.data.data);
    } catch (error) {
      console.error('Error loading stats:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="container" style={{ padding: '2rem', textAlign: 'center' }}>Загрузка...</div>;
  }

  return (
    <div className="container dashboard">
      <div className="dashboard-header">
        <h1>Добро пожаловать, {user.username}! 👋</h1>
        <p>Ваша статистика и прогресс</p>
      </div>

      <div className="stats-grid">
        <div className="stat-card primary">
          <div className="stat-icon">⭐</div>
          <div className="stat-content">
            <div className="stat-value">{user.total_points}</div>
            <div className="stat-label">Всего очков</div>
          </div>
        </div>

        <div className="stat-card success">
          <div className="stat-icon">📈</div>
          <div className="stat-content">
            <div className="stat-value">Уровень {user.level}</div>
            <div className="stat-label">Текущий уровень</div>
          </div>
        </div>

        <div className="stat-card warning">
          <div className="stat-icon">🎯</div>
          <div className="stat-content">
            <div className="stat-value">{stats?.habits.active || 0}</div>
            <div className="stat-label">Активных привычек</div>
          </div>
        </div>

        <div className="stat-card danger">
          <div className="stat-icon">🔥</div>
          <div className="stat-content">
            <div className="stat-value">{stats?.streaks.longest || 0}</div>
            <div className="stat-label">Самый длинный стрик</div>
          </div>
        </div>
      </div>

      <div className="dashboard-grid">
        <div className="dashboard-section">
          <h2>Привычки</h2>
          <div className="stats-row">
            <div className="stat-item">
              <span className="label">Всего привычек:</span>
              <span className="value">{stats?.habits.total || 0}</span>
            </div>
            <div className="stat-item">
              <span className="label">Активных:</span>
              <span className="value success">{stats?.habits.active || 0}</span>
            </div>
            <div className="stat-item">
              <span className="label">Неактивных:</span>
              <span className="value muted">{stats?.habits.inactive || 0}</span>
            </div>
          </div>
          <Link to="/habits" className="btn btn-primary">Перейти к привычкам →</Link>
        </div>

        <div className="dashboard-section">
          <h2>Задачи</h2>
          <div className="stats-row">
            <div className="stat-item">
              <span className="label">Завершено:</span>
              <span className="value">{stats?.tasks.completed || 0}</span>
            </div>
            <div className="stat-item">
              <span className="label">В работе:</span>
              <span className="value">{stats?.tasks.pending || 0}</span>
            </div>
            <div className="stat-item">
              <span className="label">Процент завершения:</span>
              <span className="value">{stats?.tasks.completion_rate || 0}%</span>
            </div>
          </div>
          <Link to="/boards" className="btn btn-primary">Перейти к доскам →</Link>
        </div>

        <div className="dashboard-section">
          <h2>Достижения</h2>
          <div className="stats-row">
            <div className="stat-item">
              <span className="label">Получено достижений:</span>
              <span className="value">{stats?.achievements.total || 0}</span>
            </div>
            <div className="stat-item">
              <span className="label">Активных стриков:</span>
              <span className="value">{stats?.streaks.active_count || 0}</span>
            </div>
          </div>
          <Link to="/achievements" className="btn btn-primary">Посмотреть достижения →</Link>
        </div>

        <div className="dashboard-section">
          <h2>Недельная активность</h2>
          <div className="weekly-activity">
            {stats?.weekly_activity && stats.weekly_activity.map((day, index) => (
              <div key={index} className="activity-day">
                <div className="day-name">
                  {new Date(day.date).toLocaleDateString('ru-RU', { weekday: 'short' })}
                </div>
                <div className={`day-bar ${day.completions > 0? 'active': ''}`} 
                     style={{ height: `${Math.min(day.completions * 20, 100)}px` }}>
                  {day.completions}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export default Dashboard;