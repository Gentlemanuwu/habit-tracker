import React, { useState, useEffect } from 'react';
import api from '../api/api';
import { on } from '../socket/socket';
import toast from 'react-hot-toast';
import HabitCalendar from '../components/HabitCalendar';
import RemindersManager from '../components/RemindersManager';
import '../styles/Habits.css';

function Habits({ user }) {
  const [habits, setHabits] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newHabit, setNewHabit] = useState({
    title: '',
    description: '',
    frequency: 'daily',
    target_count: 1,
    color: '#6366f1',
    icon: '✓',
  });
  const [selectedHabit, setSelectedHabit] = useState(null); // для календаря и напоминаний
  const [showCalendar, setShowCalendar] = useState(false);
  const [showReminders, setShowReminders] = useState(false);

  useEffect(() => {
    loadHabits();

    // Подписываемся на события
    const unsubscribe = on('habit_completed', (data) => {
      updateHabitInList(data.habitId, data);
    });

    return () => unsubscribe();
  }, []);

  const loadHabits = async () => {
    try {
      const response = await api.get('/habits');
      setHabits(response.data.data);
    } catch (error) {
      console.error('Error loading habits:', error);
    } finally {
      setLoading(false);
    }
  };

  const updateHabitInList = (habitId, data) => {
    setHabits(prev => prev.map(habit => 
      habit.id === habitId 
       ? {...habit, streak: data.streak } 
       : habit
    ));
  };

  const handleAddHabit = async (e) => {
    e.preventDefault();
    
    try {
      const response = await api.post('/habits', newHabit);
      setHabits([response.data.data,...habits]);
      setShowAddModal(false);
      setNewHabit({
        title: '',
        description: '',
        frequency: 'daily',
        target_count: 1,
        color: '#6366f1',
        icon: '✓',
      });
      toast.success('Привычка создана!');
    } catch (error) {
      console.error('Error creating habit:', error);
    }
  };

  const handleCompleteHabit = async (habitId) => {
    try {
      await api.post(`/habits/${habitId}/log`);
      // Обновление произойдет через WebSocket событие
    } catch (error) {
      console.error('Error completing habit:', error);
    }
  };

  const handleDeleteHabit = async (habitId) => {
    if (!window.confirm('Вы уверены, что хотите удалить эту привычку?')) {
      return;
    }

    try {
      await api.delete(`/habits/${habitId}`);
      setHabits(habits.filter(h => h.id!== habitId));
      toast.success('Привычка удалена');
    } catch (error) {
      console.error('Error deleting habit:', error);
    }
  };

  if (loading) {
    return <div className="container" style={{ padding: '2rem', textAlign: 'center' }}>Загрузка...</div>;
  }

  return (
    <div className="container habits-page">
      <div className="page-header">
        <h1>Мои привычки 🎯</h1>
        <button className="btn btn-primary" onClick={() => setShowAddModal(true)}>
          + Добавить привычку
        </button>
      </div>

      {habits.length === 0? (
        <div className="empty-state">
          <div className="empty-icon">🎯</div>
          <h2>Нет привычек</h2>
          <p>Создайте свою первую привычку, чтобы начать путь к успеху!</p>
          <button className="btn btn-primary" onClick={() => setShowAddModal(true)}>
            Создать привычку
          </button>
        </div>
      ): (
        <div className="habits-grid">
          {habits.map(habit => (
            <div key={habit.id} className="habit-card" style={{ borderLeftColor: habit.color }}>
              <div className="habit-header">
                <div className="habit-icon" style={{ backgroundColor: habit.color }}>
                  {habit.icon}
                </div>
                <div className="habit-info">
                  <h3>{habit.title}</h3>
                  <p>{habit.description}</p>
                </div>
              </div>

              <div className="habit-stats">
                <div className="stat">
                  <span className="stat-label">Текущий стрик</span>
                  <span className="stat-value">🔥 {habit.streak?.current_streak || 0}</span>
                </div>
                <div className="stat">
                  <span className="stat-label">Рекорд</span>
                  <span className="stat-value">🏆 {habit.streak?.longest_streak || 0}</span>
                </div>
                <div className="stat">
                  <span className="stat-label">Частота</span>
                  <span className="stat-value">
                    {habit.frequency === 'daily'? '📅 Ежедневно': '📊 Еженедельно'}
                  </span>
                </div>
              </div>

              <div className="habit-actions">
                <button 
                  className="btn btn-success btn-block"
                  onClick={() => handleCompleteHabit(habit.id)}
                >
                  Отметить выполнение ✓
                </button>
                <button 
                  className="btn btn-secondary"
                  onClick={() => {
                    setSelectedHabit(habit.id);
                    setShowCalendar(true);
                  }}
                  title="Календарь активности"
                >
                  📅
                </button>
                <button 
                  className="btn btn-secondary"
                  onClick={() => {
                    setSelectedHabit(habit.id);
                    setShowReminders(true);
                  }}
                  title="Напоминания"
                >
                  ⏰
                </button>
                <button 
                  className="btn-icon btn-danger"
                  onClick={() => handleDeleteHabit(habit.id)}
                  title="Удалить привычку"
                >
                  🗑️
                </button>
              </div>

              {/* Календарь и напоминания */}
              {selectedHabit === habit.id && showCalendar && (
                <HabitCalendar habitId={habit.id} />
              )}
              {selectedHabit === habit.id && showReminders && (
                <RemindersManager habitId={habit.id} habitTitle={habit.title} />
              )}
            </div>
          ))}
        </div>
      )}

      {showAddModal && (
        <div className="modal-overlay" onClick={() => setShowAddModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Новая привычка</h2>
              <button className="btn-close" onClick={() => setShowAddModal(false)}>×</button>
            </div>

            <form onSubmit={handleAddHabit} className="modal-form">
              <div className="form-group">
                <label>Название привычки *</label>
                <input
                  type="text"
                  className="input"
                  value={newHabit.title}
                  onChange={(e) => setNewHabit({...newHabit, title: e.target.value })}
                  required
                  placeholder="Утренняя зарядка"
                />
              </div>

              <div className="form-group">
                <label>Описание</label>
                <textarea
                  className="input"
                  value={newHabit.description}
                  onChange={(e) => setNewHabit({...newHabit, description: e.target.value })}
                  placeholder="Описание вашей привычки..."
                  rows="3"
                />
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Частота</label>
                  <select
                    className="input"
                    value={newHabit.frequency}
                    onChange={(e) => setNewHabit({...newHabit, frequency: e.target.value })}
                  >
                    <option value="daily">Ежедневно</option>
                    <option value="weekly">Еженедельно</option>
                  </select>
                </div>

                <div className="form-group">
                  <label>Цель (раз в день)</label>
                  <input
                    type="number"
                    className="input"
                    value={newHabit.target_count}
                    onChange={(e) => setNewHabit({...newHabit, target_count: parseInt(e.target.value) })}
                    min="1"
                  />
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Цвет</label>
                  <input
                    type="color"
                    className="input"
                    value={newHabit.color}
                    onChange={(e) => setNewHabit({...newHabit, color: e.target.value })}
                  />
                </div>

                <div className="form-group">
                  <label>Иконка (эмодзи)</label>
                  <input
                    type="text"
                    className="input"
                    value={newHabit.icon}
                    onChange={(e) => setNewHabit({...newHabit, icon: e.target.value })}
                    maxLength="2"
                    placeholder="💪"
                  />
                </div>
              </div>

              <div className="modal-actions">
                <button type="button" className="btn" onClick={() => setShowAddModal(false)}>
                  Отмена
                </button>
                <button type="submit" className="btn btn-primary">
                  Создать привычку
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default Habits;