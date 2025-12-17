import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { DragDropContext, Droppable, Draggable } from 'react-beautiful-dnd';
import api from '../api/api';
import { joinBoard, leaveBoard, on } from '../socket/socket';
import toast from 'react-hot-toast';
import '../styles/BoardView.css';

function BoardView() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [board, setBoard] = useState(null);
  const [columns, setColumns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddTask, setShowAddTask] = useState(null);
  const [newTask, setNewTask] = useState({
    title: '',
    description: '',
    priority: 'medium',
  });

  useEffect(() => {
    loadBoard();
    joinBoard(id);

    const unsubscribeTaskCreated = on('task_created', handleTaskCreated);
    const unsubscribeTaskUpdated = on('task_updated', handleTaskUpdated);
    const unsubscribeTaskDeleted = on('task_deleted', handleTaskDeleted);

    return () => {
      leaveBoard(id);
      unsubscribeTaskCreated();
      unsubscribeTaskUpdated();
      unsubscribeTaskDeleted();
    };
  }, [id]);

  const loadBoard = async () => {
    try {
      const [boardRes, columnsRes] = await Promise.all([
        api.get(`/boards/${id}`),
        api.get(`/boards/${id}/columns`)
      ]);
      
      setBoard(boardRes.data.data);
      setColumns(columnsRes.data.data);
    } catch (error) {
      console.error('Error loading board:', error);
      toast.error('Ошибка загрузки доски');
      navigate('/boards');
    } finally {
      setLoading(false);
    }
  };

  const handleTaskCreated = (data) => {
    if (data.boardId === parseInt(id)) {
      loadBoard();
    }
  };

  const handleTaskUpdated = (data) => {
    if (data.boardId === parseInt(id)) {
      loadBoard();
    }
  };

  const handleTaskDeleted = (data) => {
    if (data.boardId === parseInt(id)) {
      loadBoard();
    }
  };

  const handleDragEnd = async (result) => {
    const { source, destination, draggableId } = result;

    if (!destination) return;

    if (
      source.droppableId === destination.droppableId &&
      source.index === destination.index
    ) {
      return;
    }

    try {
      await api.put(`/tasks/${draggableId}/move`, {
        column_id: parseInt(destination.droppableId),
        position: destination.index,
      });

      loadBoard();
    } catch (error) {
      console.error('Error moving task:', error);
      toast.error('Ошибка перемещения задачи');
    }
  };

  const handleCreateTask = async (e, columnId) => {
    e.preventDefault();

    try {
      await api.post('/tasks', {
       ...newTask,
        column_id: columnId,
      });

      setShowAddTask(null);
      setNewTask({ title: '', description: '', priority: 'medium' });
      loadBoard();
    } catch (error) {
      console.error('Error creating task:', error);
    }
  };

  const handleDeleteTask = async (taskId) => {
    if (!window.confirm('Удалить задачу?')) return;

    try {
      await api.delete(`/tasks/${taskId}`);
      loadBoard();
    } catch (error) {
      console.error('Error deleting task:', error);
    }
  };

  const handleToggleComplete = async (task) => {
    try {
      await api.put(`/tasks/${task.id}`, {
        completed:!task.completed,
      });
      loadBoard();
    } catch (error) {
      console.error('Error toggling task:', error);
    }
  };

  const getPriorityColor = (priority) => {
    const colors = {
      low: '#22c55e',
      medium: '#f59e0b',
      high: '#ef4444',
      urgent: '#dc2626',
    };
    return colors[priority] || colors.medium;
  };

  if (loading) {
    return (
      <div className="container" style={{ padding: '2rem', textAlign: 'center' }}>
        Загрузка...
      </div>
    );
  }

  return (
    <div className="board-view">
      <div className="board-view-header">
        <button className="btn-back" onClick={() => navigate('/boards')}>
          ← Назад
        </button>
        <div className="board-info">
          <h1>{board?.title}</h1>
          <p>{board?.description}</p>
        </div>
      </div>

      <DragDropContext onDragEnd={handleDragEnd}>
        <div className="kanban-board">
          {columns.map((column) => (
            <div key={column.id} className="kanban-column">
              <div 
                className="column-header"
                style={{ borderTopColor: column.color }}
              >
                <h3>{column.title}</h3>
                <span className="task-count">{column.tasks?.length || 0}</span>
              </div>

              <Droppable droppableId={String(column.id)}>
                {(provided, snapshot) => (
                  <div
                    ref={provided.innerRef}
                    {...provided.droppableProps}
                    className={`column-content ${snapshot.isDraggingOver? 'dragging-over': ''}`}
                  >
                    {column.tasks?.map((task, index) => (
                      <Draggable
                        key={task.id}
                        draggableId={String(task.id)}
                        index={index}
                      >
                        {(provided, snapshot) => (
                          <div
                            ref={provided.innerRef}
                            {...provided.draggableProps}
                            {...provided.dragHandleProps}
                            className={`task-card ${snapshot.isDragging? 'dragging': ''} ${task.completed? 'completed': ''}`}
                          >
                            <div className="task-header">
                              <input
                                type="checkbox"
                                checked={task.completed}
                                onChange={() => handleToggleComplete(task)}
                                onClick={(e) => e.stopPropagation()}
                              />
                              <h4>{task.title}</h4>
                            </div>

                            {task.description && (
                              <p className="task-description">{task.description}</p>
                            )}

                            <div className="task-footer">
                              <span 
                                className="task-priority"
                                style={{ backgroundColor: getPriorityColor(task.priority) }}
                              >
                                {task.priority}
                              </span>
                              {task.due_date && (
                                <span className="task-due-date">
                                  📅 {new Date(task.due_date).toLocaleDateString('ru-RU')}
                                </span>
                              )}
                              <button
                                className="btn-delete-task"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleDeleteTask(task.id);
                                }}
                              >
                                🗑️
                              </button>
                            </div>
                          </div>
                        )}
                      </Draggable>
                    ))}
                    {provided.placeholder}

                    {showAddTask === column.id? (
                      <form 
                        className="add-task-form"
                        onSubmit={(e) => handleCreateTask(e, column.id)}
                      >
                        <input
                          type="text"
                          value={newTask.title}
                          onChange={(e) => setNewTask({...newTask, title: e.target.value })}
                          placeholder="Название задачи"
                          required
                          autoFocus
                          className="input"
                        />
                        <textarea
                          value={newTask.description}
                          onChange={(e) => setNewTask({...newTask, description: e.target.value })}
                          placeholder="Описание"
                          className="input"
                          rows="2"
                        />
                        <div className="form-actions">
                          <select
                            value={newTask.priority}
                            onChange={(e) => setNewTask({...newTask, priority: e.target.value })}
                            className="input"
                          >
                            <option value="low">Низкий</option>
                            <option value="medium">Средний</option>
                            <option value="high">Высокий</option>
                            <option value="urgent">Срочно</option>
                          </select>
                          <button type="submit" className="btn btn-primary btn-sm">
                            Добавить
                          </button>
                          <button 
                            type="button" 
                            className="btn btn-sm"
                            onClick={() => {
                              setShowAddTask(null);
                              setNewTask({ title: '', description: '', priority: 'medium' });
                            }}
                          >
                            Отмена
                          </button>
                        </div>
                      </form>
                    ): (
                      <button
                        className="btn-add-task"
                        onClick={() => setShowAddTask(column.id)}
                      >
                        + Добавить задачу
                      </button>
                    )}
                  </div>
                )}
              </Droppable>
            </div>
          ))}
        </div>
      </DragDropContext>
    </div>
  );
}

export default BoardView;