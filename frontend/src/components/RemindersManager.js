import React, { useState, useEffect } from 'react';
import api from '../api/api';
import toast from 'react-hot-toast';
import '../styles/Reminders.css';

function RemindersManager({ habitId, habitTitle }) {
  const [reminders, setReminders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newReminder, setNewReminder] = useState({
    time: '09:00:00',
    days: ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'],
    enabled: true,
  });

  const daysOfWeek = [
    { key: 'mon', label: 'Пн' },
    { key: 'tue', label: 'Вт' },
    { key: 'wed', label: 'Ср' },
    { key: 'thu', label: 'Чт' },
    { key: 'fri', label: 'Пт' },
    { key: 'sat', label: 'Сб' },
    { key: 'sun', label: 'Вс' },
  ];

  useEffect(() => {
    loadReminders();
  }, [habitId]);

  const loadReminders = async () => {
    try {
      const response = await api.get('/reminders');
      const habitReminders = response.data.data.filter(
        r => r.habit_id === habitId
      );
      setReminders(habitReminders);
    } catch (error) {
      console.error('Error loading reminders:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddReminder = async (e) => {
    e.preventDefault();

    try {
      const response = await api.post('/reminders', {
        habit_id: habitId,
       ...newReminder,
      });

      setReminders([...reminders, response.data.data]);
      setShowAddForm(false);
      setNewReminder({
        time: '09:00:00',
        days: ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'],
        enabled: true,
      });
      toast.success('Напоминание создано!');
    } catch (error) {
      console.error('Error creating reminder:', error);
    }
  };

  const handleToggleReminder = async (reminderId, currentStatus) => {
    try {
      await api.put(`/reminders/${reminderId}`, {
        enabled:!currentStatus,
      });

      setReminders(reminders.map(r =>
        r.id === reminderId? {...r, enabled:!currentStatus }: r
      ));

      toast.success(!currentStatus? 'Напоминание включено': 'Напоминание выключено');
    } catch (error) {
      console.error('Error toggling reminder:', error);
    }
  };

  const handleDeleteReminder = async (reminderId) => {
    if (!window.confirm('Удалить это напоминание?')) return;

    try {
      await api.delete(`/reminders/${reminderId}`);
      setReminders(reminders.filter(r => r.id!== reminderId));
      toast.success('Напоминание удалено');
    } catch (error) {
      console.error('Error deleting reminder:', error);
    }
  };

  const toggleDay = (day) => {
    if (newReminder.days.includes(day)) {
      setNewReminder({
       ...newReminder,
        days: newReminder.days.filter(d => d!== day),
      });
    } else {
      setNewReminder({
       ...newReminder,
        days: [...newReminder.days, day],
      });
    }
  };

  const formatTime = (timeString) => {
    const [hours, minutes] = timeString.split(':');
    return `${hours}:${minutes}`;
  };

  const formatDays = (days) => {
    if (days.length === 7) return 'Каждый день';
    return days.map(d => daysOfWeek.find(dow => dow.key === d)?.label).join(', ');
  };

  if (loading) {
    return <div className="reminders-loading">Загрузка напоминаний...</div>;
  }

  return (
    <div className="reminders-manager">
      <div className="reminders-header">
        <h3>⏰ Напоминания</h3>
        <button 
          className="btn btn-primary btn-sm"
          onClick={() => setShowAddForm(!showAddForm)}
        >
          {showAddForm? 'Отмена': '+ Добавить'}
        </button>
      </div>

      {showAddForm && (
        <form onSubmit={handleAddReminder} className="reminder-form">
          <div className="form-group">
            <label>Время</label>
            <input
              type="time"
              value={formatTime(newReminder.time)}
              onChange={(e) => setNewReminder({
               ...newReminder,
                time: e.target.value + ':00',
              })}
              className="input"
              required
            />
          </div>

          <div className="form-group">
            <label>Дни недели</label>
            <div className="days-selector">
              {daysOfWeek.map(day => (
                <button
                  key={day.key}
                  type="button"
                  className={`day-button ${newReminder.days.includes(day.key)? 'active': ''}`}
                  onClick={() => toggleDay(day.key)}
                >
                  {day.label}
                </button>
              ))}
            </div>
          </div>

          <button type="submit" className="btn btn-primary">
            Создать напоминание
          </button>
        </form>
      )}

      {reminders.length === 0? (
        <div className="no-reminders">
          <p>Напоминаний нет</p>
          <p className="text-muted">Создайте напоминание, чтобы не забывать о привычке</p>
        </div>
      ): (
        <div className="reminders-list">
          {reminders.map(reminder => (
            <div 
              key={reminder.id} 
              className={`reminder-item ${reminder.enabled? 'enabled': 'disabled'}`}
            >
              <div className="reminder-info">
                <div className="reminder-time">
                  ⏰ {formatTime(reminder.time)}
                </div>
                <div className="reminder-days">
                  {formatDays(reminder.days)}
                </div>
              </div>

              <div className="reminder-actions">
                <button
                  onClick={() => handleToggleReminder(reminder.id, reminder.enabled)}
                  className="btn-toggle"
                  title={reminder.enabled? 'Выключить': 'Включить'}
                >
                  {reminder.enabled? '🔔': '🔕'}
                </button>
                <button
                  onClick={() => handleDeleteReminder(reminder.id)}
                  className="btn-delete"
                  title="Удалить"
                >
                  🗑️
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default RemindersManager;