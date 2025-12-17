import React, { useState, useEffect } from 'react';
import api from '../api/api';
import { 
  LineChart, Line, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer 
} from 'recharts';
import '../styles/Stats.css';

function Stats() {
  const [stats, setStats] = useState(null);
  const [habits, setHabits] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedPeriod, setSelectedPeriod] = useState('week'); // week, month, year

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [statsRes, habitsRes] = await Promise.all([
        api.get('/user/stats'),
        api.get('/habits'),
      ]);
      
      setStats(statsRes.data.data);
      setHabits(habitsRes.data.data);
    } catch (error) {
      console.error('Error loading stats:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="container" style={{ padding: '2rem', textAlign: 'center' }}>
        Загрузка статистики...
      </div>
    );
  }

  // Данные для графика недельной активности
  const weeklyData = stats?.weekly_activity?.map(day => ({
    day: new Date(day.date).toLocaleDateString('ru-RU', { weekday: 'short' }),
    completions: day.completions,
    points: day.points,
  })) || [];

  // Данные для круговой диаграммы задач
  const tasksData = [
    { name: 'Завершено', value: stats?.tasks.completed || 0, color: '#22c55e' },
    { name: 'В работе', value: stats?.tasks.pending || 0, color: '#f59e0b' },
  ];

  // Данные для круговой диаграммы привычек
  const habitsData = [
    { name: 'Активные', value: stats?.habits.active || 0, color: '#6366f1' },
    { name: 'Неактивные', value: stats?.habits.inactive || 0, color: '#9ca3af' },
  ];

  // Топ привычек по стрикам
  const topHabits = [...habits]
   .sort((a, b) => (b.streak?.current_streak || 0) - (a.streak?.current_streak || 0))
   .slice(0, 5)
   .map(h => ({
      name: h.title.length > 20? h.title.substring(0, 20) + '...': h.title,
      streak: h.streak?.current_streak || 0,
      color: h.color,
    }));

  return (
    <div className="container stats-page">
      <div className="page-header">
        <h1>Статистика и аналитика 📈</h1>
        <div className="period-selector">
          <button 
            className={selectedPeriod === 'week'? 'active': ''}
            onClick={() => setSelectedPeriod('week')}
          >
            Неделя
          </button>
          <button 
            className={selectedPeriod === 'month'? 'active': ''}
            onClick={() => setSelectedPeriod('month')}
          >
            Месяц
          </button>
          <button 
            className={selectedPeriod === 'year'? 'active': ''}
            onClick={() => setSelectedPeriod('year')}
          >
            Год
          </button>
        </div>
      </div>

      {/* Ключевые метрики */}
      <div className="metrics-grid">
        <div className="metric-card">
          <div className="metric-icon">⭐</div>
          <div className="metric-content">
            <div className="metric-value">{stats?.total_points || 0}</div>
            <div className="metric-label">Всего очков</div>
          </div>
        </div>

        <div className="metric-card">
          <div className="metric-icon">📈</div>
          <div className="metric-content">
            <div className="metric-value">Уровень {stats?.level || 1}</div>
            <div className="metric-label">Текущий уровень</div>
          </div>
        </div>

        <div className="metric-card">
          <div className="metric-icon">🔥</div>
          <div className="metric-content">
            <div className="metric-value">{stats?.streaks.longest || 0}</div>
            <div className="metric-label">Рекордный стрик</div>
          </div>
        </div>

        <div className="metric-card">
          <div className="metric-icon">🏆</div>
          <div className="metric-content">
            <div className="metric-value">{stats?.achievements.total || 0}</div>
            <div className="metric-label">Достижений</div>
          </div>
        </div>
      </div>

      {/* Графики */}
      <div className="charts-grid">
        {/* График недельной активности */}
        <div className="chart-card">
          <h2>Активность за неделю</h2>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={weeklyData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="day" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey="completions" fill="#6366f1" name="Выполнено" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Круговая диаграмма задач */}
        <div className="chart-card">
          <h2>Распределение задач</h2>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={tasksData}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                outerRadius={80}
                fill="#8884d8"
                dataKey="value"
              >
                {tasksData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
          <div className="chart-legend">
            <div className="legend-item">
              <span className="legend-color" style={{ background: '#22c55e' }}></span>
              <span>Завершено: {stats?.tasks.completed || 0}</span>
            </div>
            <div className="legend-item">
              <span className="legend-color" style={{ background: '#f59e0b' }}></span>
              <span>В работе: {stats?.tasks.pending || 0}</span>
            </div>
          </div>
        </div>

        {/* Круговая диаграмма привычек */}
        <div className="chart-card">
          <h2>Статус привычек</h2>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={habitsData}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                outerRadius={80}
                fill="#8884d8"
                dataKey="value"
              >
                {habitsData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
          <div className="chart-legend">
            <div className="legend-item">
              <span className="legend-color" style={{ background: '#6366f1' }}></span>
              <span>Активные: {stats?.habits.active || 0}</span>
            </div>
            <div className="legend-item">
              <span className="legend-color" style={{ background: '#9ca3af' }}></span>
              <span>Неактивные: {stats?.habits.inactive || 0}</span>
            </div>
          </div>
        </div>

        {/* Топ привычек по стрикам */}
        <div className="chart-card full-width">
          <h2>Топ-5 привычек по стрикам 🔥</h2>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={topHabits} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis type="number" />
              <YAxis dataKey="name" type="category" width={150} />
              <Tooltip />
              <Bar dataKey="streak" name="Текущий стрик">
                {topHabits.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Детальная статистика */}
      <div className="detailed-stats">
        <h2>Детальная статистика</h2>
        <div className="stats-grid-detailed">
          <div className="stat-detail-card">
            <h3>Привычки</h3>
            <div className="stat-rows">
              <div className="stat-row">
                <span>Всего привычек:</span>
                <strong>{stats?.habits.total || 0}</strong>
              </div>
              <div className="stat-row">
                <span>Активных:</span>
                <strong className="text-success">{stats?.habits.active || 0}</strong>
              </div>
              <div className="stat-row">
                <span>Неактивных:</span>
                <strong className="text-muted">{stats?.habits.inactive || 0}</strong>
              </div>
            </div>
          </div>

          <div className="stat-detail-card">
            <h3>Задачи</h3>
            <div className="stat-rows">
              <div className="stat-row">
                <span>Всего задач:</span>
                <strong>{stats?.tasks.total || 0}</strong>
              </div>
              <div className="stat-row">
                <span>Завершено:</span>
                <strong className="text-success">{stats?.tasks.completed || 0}</strong>
              </div>
              <div className="stat-row">
                <span>Процент завершения:</span>
                <strong>{stats?.tasks.completion_rate || 0}%</strong>
              </div>
            </div>
          </div>

          <div className="stat-detail-card">
            <h3>Стрики</h3>
            <div className="stat-rows">
              <div className="stat-row">
                <span>Рекордный стрик:</span>
                <strong className="text-warning">{stats?.streaks.longest || 0} дней</strong>
              </div>
              <div className="stat-row">
                <span>Активных стриков:</span>
                <strong>{stats?.streaks.active_count || 0}</strong>
              </div>
            </div>
          </div>

          <div className="stat-detail-card">
            <h3>Аккаунт</h3>
            <div className="stat-rows">
              <div className="stat-row">
                <span>Участник с:</span>
                <strong>
                  {stats?.member_since 
                   ? new Date(stats.member_since).toLocaleDateString('ru-RU') 
                   : 'N/A'}
                </strong>
              </div>
              <div className="stat-row">
                <span>Всего достижений:</span>
                <strong className="text-success">{stats?.achievements.total || 0}</strong>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Stats;