import React, { useState, useEffect } from 'react';
import api from '../api/api';
import { on } from '../socket/socket';
import toast from 'react-hot-toast';
import '../styles/Achievements.css';

function Achievements() {
  const [achievements, setAchievements] = useState([]);
  const [available, setAvailable] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('unlocked'); // unlocked, available

  useEffect(() => {
    loadData();

    const unsubscribe = on('achievement_unlocked', (data) => {
      loadData();
      toast.success(
        `Новое достижение: ${data.achievement.title}!`,
        { icon: data.achievement.icon || '🏆', duration: 5000 }
      );
    });

    return () => unsubscribe();
  }, []);

  const loadData = async () => {
    try {
      const [achievementsRes, availableRes, statsRes] = await Promise.all([
        api.get('/achievements'),
        api.get('/achievements/available'),
        api.get('/achievements/stats'),
      ]);

      setAchievements(achievementsRes.data.data.all || []);
      setAvailable(availableRes.data.data || []);
      setStats(statsRes.data.data);
    } catch (error) {
      console.error('Error loading achievements:', error);
    } finally {
      setLoading(false);
    }
  };

  const getRarityColor = (rarity) => {
    const colors = {
      bronze: '#cd7f32',
      silver: '#c0c0c0',
      gold: '#ffd700',
      platinum: '#e5e4e2',
    };
    return colors[rarity] || '#9ca3af';
  };

  const getRarityGradient = (rarity) => {
    const gradients = {
      bronze: 'linear-gradient(135deg, #cd7f32 0%, #b87333 100%)',
      silver: 'linear-gradient(135deg, #c0c0c0 0%, #a8a8a8 100%)',
      gold: 'linear-gradient(135deg, #ffd700 0%, #ffed4e 100%)',
      platinum: 'linear-gradient(135deg, #e5e4e2 0%, #b8b8b8 100%)',
    };
    return gradients[rarity] || '#9ca3af';
  };

  if (loading) {
    return (
      <div className="container" style={{ padding: '2rem', textAlign: 'center' }}>
        Загрузка достижений...
      </div>
    );
  }

  return (
    <div className="container achievements-page">
      <div className="page-header">
        <h1>Достижения и награды 🏆</h1>
      </div>

      {/* Общая статистика */}
      <div className="achievements-stats">
        <div className="stat-box">
          <div className="stat-number">{stats?.total_unlocked || 0}</div>
          <div className="stat-label">Разблокировано</div>
        </div>
        <div className="stat-box">
          <div className="stat-number">{stats?.total_points || 0}</div>
          <div className="stat-label">Очков получено</div>
        </div>
        <div className="stat-box">
          <div className="stat-number">{stats?.completion_percentage || 0}%</div>
          <div className="stat-label">Прогресс</div>
        </div>
      </div>

      {/* Прогресс по редкости */}
      <div className="rarity-progress">
        <h3>По редкости</h3>
        <div className="rarity-grid">
          <div className="rarity-item">
            <span className="rarity-badge bronze">🥉</span>
            <span className="rarity-name">Бронза</span>
            <span className="rarity-count">{stats?.by_rarity.bronze || 0}</span>
          </div>
          <div className="rarity-item">
            <span className="rarity-badge silver">🥈</span>
            <span className="rarity-name">Серебро</span>
            <span className="rarity-count">{stats?.by_rarity.silver || 0}</span>
          </div>
          <div className="rarity-item">
            <span className="rarity-badge gold">🥇</span>
            <span className="rarity-name">Золото</span>
            <span className="rarity-count">{stats?.by_rarity.gold || 0}</span>
          </div>
          <div className="rarity-item">
            <span className="rarity-badge platinum">💎</span>
            <span className="rarity-name">Платина</span>
            <span className="rarity-count">{stats?.by_rarity.platinum || 0}</span>
          </div>
        </div>
      </div>

      {/* Табы */}
      <div className="tabs">
        <button
          className={activeTab === 'unlocked'? 'active': ''}
          onClick={() => setActiveTab('unlocked')}
        >
          Полученные ({achievements.length})
        </button>
        <button
          className={activeTab === 'available'? 'active': ''}
          onClick={() => setActiveTab('available')}
        >
          Доступные ({available.length})
        </button>
      </div>

      {/* Список достижений */}
      {activeTab === 'unlocked'? (
        achievements.length === 0? (
          <div className="empty-state">
            <div className="empty-icon">🏆</div>
            <h2>Пока нет достижений</h2>
            <p>Начните выполнять привычки и задачи, чтобы получить первые награды!</p>
          </div>
        ): (
          <div className="achievements-grid">
            {achievements.map((achievement) => (
              <div
                key={achievement.id}
                className="achievement-card unlocked"
                style={{ background: getRarityGradient(achievement.rarity) }}
              >
                <div className="achievement-icon">{achievement.icon || '🏆'}</div>
                <div className="achievement-content">
                  <h3>{achievement.title}</h3>
                  <p>{achievement.description}</p>
                  <div className="achievement-footer">
                    <span className="achievement-points">+{achievement.points} очков</span>
                    <span className="achievement-date">
                      {new Date(achievement.unlocked_at).toLocaleDateString('ru-RU')}
                    </span>
                  </div>
                </div>
                <div className="achievement-rarity">
                  {achievement.rarity}
                </div>
              </div>
            ))}
          </div>
        )
      ): (
        available.length === 0? (
          <div className="empty-state">
            <div className="empty-icon">✨</div>
            <h2>Все достижения получены!</h2>
            <p>Поздравляем! Вы разблокировали все доступные достижения!</p>
          </div>
        ): (
          <div className="achievements-grid">
            {available.map((achievement, index) => (
              <div
                key={index}
                className="achievement-card locked"
              >
                <div className="achievement-icon locked-icon">🔒</div>
                <div className="achievement-content">
                  <h3>{achievement.title}</h3>
                  <p>{achievement.description}</p>
                  <div className="achievement-footer">
                    <span className="achievement-points">+{achievement.points} очков</span>
                    <span className="achievement-requirement">{achievement.requirement}</span>
                  </div>
                </div>
                <div className="achievement-rarity">
                  {achievement.rarity}
                </div>
              </div>
            ))}
          </div>
        )
      )}
    </div>
  );
}

export default Achievements;