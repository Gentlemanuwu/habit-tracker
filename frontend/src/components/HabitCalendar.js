import React, { useState, useEffect } from 'react';
import api from '../api/api';
import '../styles/HabitCalendar.css';

function HabitCalendar({ habitId }) {
  const [calendarData, setCalendarData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedMonth, setSelectedMonth] = useState(new Date());

  useEffect(() => {
    loadCalendarData();
  }, [habitId, selectedMonth]);

  const loadCalendarData = async () => {
    try {
      const response = await api.get(`/habits/${habitId}/stats`);
      const logs = response.data.data.logs || [];
      
      // Преобразуем логи в данные для календаря
      const dataMap = {};
      logs.forEach(log => {
        const date = new Date(log.completed_at).toLocaleDateString('en-CA'); // YYYY-MM-DD
        dataMap[date] = (dataMap[date] || 0) + 1;
      });

      setCalendarData(dataMap);
    } catch (error) {
      console.error('Error loading calendar data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getDaysInMonth = (date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    
    const days = [];
    const startPadding = firstDay.getDay();
    
    // Добавляем пустые дни перед первым днем месяца
    for (let i = 0; i < startPadding; i++) {
      days.push(null);
    }
    
    // Добавляем все дни месяца
    for (let day = 1; day <= lastDay.getDate(); day++) {
      days.push(new Date(year, month, day));
    }
    
    return days;
  };

  const getIntensityClass = (count) => {
    if (!count) return 'intensity-0';
    if (count === 1) return 'intensity-1';
    if (count === 2) return 'intensity-2';
    if (count >= 3) return 'intensity-3';
    return 'intensity-0';
  };

  const getDateKey = (date) => {
    if (!date) return null;
    return date.toLocaleDateString('en-CA'); // YYYY-MM-DD
  };

  const changeMonth = (delta) => {
    const newDate = new Date(selectedMonth);
    newDate.setMonth(newDate.getMonth() + delta);
    setSelectedMonth(newDate);
  };

  const days = getDaysInMonth(selectedMonth);

  if (loading) {
    return <div className="calendar-loading">Загрузка календаря...</div>;
  }

  return (
    <div className="habit-calendar">
      <div className="calendar-header">
        <button onClick={() => changeMonth(-1)} className="btn-month">
          ←
        </button>
        <h3>
          {selectedMonth.toLocaleDateString('ru-RU', { 
            month: 'long', 
            year: 'numeric' 
          })}
        </h3>
        <button onClick={() => changeMonth(1)} className="btn-month">
          →
        </button>
      </div>

      <div className="calendar-weekdays">
        <div>Вс</div>
        <div>Пн</div>
        <div>Вт</div>
        <div>Ср</div>
        <div>Чт</div>
        <div>Пт</div>
        <div>Сб</div>
      </div>

      <div className="calendar-grid">
        {days.map((date, index) => {
          if (!date) {
            return <div key={`empty-${index}`} className="calendar-day empty" />;
          }

          const dateKey = getDateKey(date);
          const count = calendarData[dateKey] || 0;
          const isToday = date.toDateString() === new Date().toDateString();
          const isFuture = date > new Date();

          return (
            <div
              key={index}
              className={`calendar-day ${getIntensityClass(count)} ${
                isToday? 'today': ''
              } ${isFuture? 'future': ''}`}
              title={`${date.toLocaleDateString('ru-RU')}: ${count} выполнений`}
            >
              <span className="day-number">{date.getDate()}</span>
              {count > 0 && <span className="completion-indicator">✓</span>}
            </div>
          );
        })}
      </div>

      <div className="calendar-legend">
        <span>Меньше</span>
        <div className="legend-item intensity-0" />
        <div className="legend-item intensity-1" />
        <div className="legend-item intensity-2" />
        <div className="legend-item intensity-3" />
        <span>Больше</span>
      </div>
    </div>
  );
}

export default HabitCalendar;