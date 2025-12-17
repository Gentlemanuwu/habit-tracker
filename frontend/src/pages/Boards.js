import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../api/api';
import toast from 'react-hot-toast';
import '../styles/Boards.css';

function Boards() {
  const [boards, setBoards] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newBoard, setNewBoard] = useState({
    title: '',
    description: '',
    color: '#6366f1',
  });

  useEffect(() => {
    loadBoards();
  }, []);

  const loadBoards = async () => {
    try {
      const response = await api.get('/boards');
      setBoards(response.data.data);
    } catch (error) {
      console.error('Error loading boards:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateBoard = async (e) => {
    e.preventDefault();
    
    try {
      const response = await api.post('/boards', newBoard);
      setBoards([response.data.data,...boards]);
      setShowCreateModal(false);
      setNewBoard({ title: '', description: '', color: '#6366f1' });
      toast.success('Доска создана!');
    } catch (error) {
      console.error('Error creating board:', error);
    }
  };

  const handleDeleteBoard = async (boardId) => {
    if (!window.confirm('Вы уверены, что хотите удалить эту доску? Все задачи будут удалены.')) {
      return;
    }

    try {
      await api.delete(`/boards/${boardId}`);
      setBoards(boards.filter(b => b.id!== boardId));
      toast.success('Доска удалена');
    } catch (error) {
      console.error('Error deleting board:', error);
    }
  };

  if (loading) {
    return (
      <div className="container" style={{ padding: '2rem', textAlign: 'center' }}>
        Загрузка...
      </div>
    );
  }

  return (
    <div className="container boards-page">
      <div className="page-header">
        <h1>Канбан-доски 📋</h1>
        <button className="btn btn-primary" onClick={() => setShowCreateModal(true)}>
          + Создать доску
        </button>
      </div>

      {boards.length === 0? (
        <div className="empty-state">
          <div className="empty-icon">📋</div>
          <h2>Нет досок</h2>
          <p>Создайте свою первую канбан-доску для управления задачами!</p>
          <button className="btn btn-primary" onClick={() => setShowCreateModal(true)}>
            Создать доску
          </button>
        </div>
      ): (
        <div className="boards-grid">
          {boards.map(board => (
            <div 
              key={board.id} 
              className="board-card"
              style={{ borderLeftColor: board.color }}
            >
              <Link to={`/boards/${board.id}`} className="board-link">
                <div className="board-header">
                  <div 
                    className="board-color" 
                    style={{ backgroundColor: board.color }}
                  />
                  <h3>{board.title}</h3>
                </div>
                <p className="board-description">
                  {board.description || 'Нет описания'}
                </p>
                <div className="board-footer">
                  <span className="board-date">
                    Создана: {new Date(board.created_at).toLocaleDateString('ru-RU')}
                  </span>
                </div>
              </Link>
              <div className="board-actions">
                <button
                  className="btn-icon btn-danger"
                  onClick={(e) => {
                    e.preventDefault();
                    handleDeleteBoard(board.id);
                  }}
                  title="Удалить доску"
                >
                  🗑️
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {showCreateModal && (
        <div className="modal-overlay" onClick={() => setShowCreateModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Создать доску</h2>
              <button className="btn-close" onClick={() => setShowCreateModal(false)}>
                ×
              </button>
            </div>

            <form onSubmit={handleCreateBoard} className="modal-form">
              <div className="form-group">
                <label>Название доски *</label>
                <input
                  type="text"
                  value={newBoard.title}
                  onChange={(e) => setNewBoard({...newBoard, title: e.target.value })}
                  required
                  className="input"
                  placeholder="Мой проект"
                />
              </div>

              <div className="form-group">
                <label>Описание</label>
                <textarea
                  value={newBoard.description}
                  onChange={(e) => setNewBoard({...newBoard, description: e.target.value })}
                  className="input"
                  rows="3"
                  placeholder="Краткое описание доски"
                />
              </div>

              <div className="form-group">
                <label>Цвет</label>
                <div className="color-picker">
                  {['#6366f1', '#ef4444', '#f59e0b', '#22c55e', '#8b5cf6', '#ec4899'].map(color => (
                    <button
                      key={color}
                      type="button"
                      className={`color-option ${newBoard.color === color? 'active': ''}`}
                      style={{ backgroundColor: color }}
                      onClick={() => setNewBoard({...newBoard, color })}
                    />
                  ))}
                </div>
              </div>

              <div className="modal-actions">
                <button type="button" className="btn" onClick={() => setShowCreateModal(false)}>
                  Отмена
                </button>
                <button type="submit" className="btn btn-primary">
                  Создать
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default Boards;