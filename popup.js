document.addEventListener('DOMContentLoaded', () => {
  const favoritesList = document.getElementById('favoritesList');
  const editForm = document.getElementById('editForm');
  const editTitle = document.getElementById('editTitle');
  const editDescription = document.getElementById('editDescription');
  const saveEditBtn = document.getElementById('saveEdit');
  const cancelEditBtn = document.getElementById('cancelEdit');
  const exportBtn = document.getElementById('exportBtn');
  const importFile = document.getElementById('importFile');
  const lightThemeBtn = document.getElementById('lightTheme');
  const darkThemeBtn = document.getElementById('darkTheme');
  
  let currentEditingId = null;
  
  // Добавляем стили для всего popup
  const globalStyle = document.createElement('style');
  globalStyle.textContent = `
    :root {
      --bg-color: #f8f9fa;
      --text-color: #1a1a1a;
      --border-color: #e9ecef;
      --btn-bg: white;
      --btn-color: #495057;
      --btn-border: #dee2e6;
      --btn-hover-bg: #f8f9fa;
      --btn-hover-border: #ced4da;
      --description-color: #6c757d;
      --time-color: #868e96;
      --shadow-color: rgba(0,0,0,0.05);
      --hover-shadow-color: rgba(0,0,0,0.1);
      --icon-size: 15px;
    }

    [data-theme="dark"] {
      --bg-color: #212529;
      --text-color: #f8f9fa;
      --border-color: #343a40;
      --btn-bg: #343a40;
      --btn-color: #e9ecef;
      --btn-border: #495057;
      --btn-hover-bg: #495057;
      --btn-hover-border: #6c757d;
      --description-color: #adb5bd;
      --time-color: #868e96;
      --shadow-color: rgba(0,0,0,0.2);
      --hover-shadow-color: rgba(0,0,0,0.3);
    }

    body {
      width: 350px;
      min-height: 200px;
      margin: 0;
      padding: 16px;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
      background: var(--bg-color);
      color: var(--text-color);
      transition: all 0.3s ease;
    }

    .theme-toggle, .header-buttons {
      display: flex;
      gap: 4px;
    }

    .theme-btn {
      width: 28px;
      height: 28px;
      padding: 0;
      border-radius: 4px;
      border: 1px solid var(--btn-border);
      background: var(--btn-bg);
      color: var(--btn-color);
      cursor: pointer;
      transition: all 0.2s ease;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: var(--icon-size);
      line-height: 1;
      position: relative;
    }

    .theme-btn input[type="file"] {
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      opacity: 0;
      cursor: pointer;
    }

    .theme-btn label {
      font-size: var(--icon-size);
      line-height: 1;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .theme-btn:hover {
      background: var(--btn-hover-bg);
      border-color: var(--btn-hover-border);
    }

    .theme-btn.active {
      background: var(--btn-hover-bg);
      border-color: var(--btn-hover-border);
      box-shadow: inset 0 2px 4px var(--shadow-color);
    }

    .header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin: 0 0 16px 0;
      padding-bottom: 12px;
      border-bottom: 2px solid var(--border-color);
    }

    .header-left {
      display: flex;
      align-items: center;
      gap: 12px;
    }

    .header-buttons {
      display: flex;
      gap: 4px;
    }

    .header-buttons .btn {
      font-size: 14px;
      padding: 4px 8px;
      border-radius: 4px;
      border: 1px solid var(--btn-border);
      background: var(--btn-bg);
      color: var(--btn-color);
      cursor: pointer;
      display: flex;
      align-items: center;
      transition: all 0.2s ease;
    }

    .header-buttons .btn:hover {
      background: var(--btn-hover-bg);
      border-color: var(--btn-hover-border);
    }

    .btn-icon {
      font-size: 14px;
      margin-right: 4px;
    }

    h1 {
      font-size: 18px;
      color: var(--text-color);
      margin: 0;
    }

    .no-favorites {
      text-align: center;
      color: var(--description-color);
      padding: 32px 16px;
      background: var(--btn-bg);
      border-radius: 8px;
      box-shadow: 0 2px 4px var(--shadow-color);
      margin-top: 16px;
    }

    .favorite-chat {
      margin-bottom: 12px;
      animation: slideIn 0.3s ease;
    }

    .chat-item {
      padding: 12px;
      border-radius: 8px;
      background: var(--btn-bg);
      border: 1px solid var(--btn-border);
      transition: all 0.2s ease;
    }

    .chat-item:hover {
      transform: translateY(-2px);
      box-shadow: 0 4px 8px var(--hover-shadow-color);
    }

    .chat-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      margin-bottom: 4px;
    }

    .chat-title {
      color: var(--text-color);
      text-decoration: none;
      font-weight: 500;
      flex-grow: 1;
      margin-right: 8px;
      font-size: 14px;
      line-height: 1.4;
    }

    .chat-title:hover {
      text-decoration: underline;
    }

    .chat-time {
      font-size: 12px;
      color: var(--time-color);
      margin-bottom: 4px;
    }

    .description {
      font-size: 13px;
      color: var(--description-color);
      margin-top: 4px;
      line-height: 1.4;
      white-space: pre-wrap;
    }

    .button-group {
      display: flex;
      gap: 4px;
    }

    .edit-btn, .delete-btn {
      padding: 4px;
      border: none;
      background: none;
      color: var(--btn-color);
      cursor: pointer;
      border-radius: 4px;
      transition: all 0.2s ease;
      opacity: 0.7;
    }

    .edit-btn:hover, .delete-btn:hover {
      background: var(--btn-hover-bg);
      opacity: 1;
    }

    .edit-form {
      display: none;
      padding: 12px;
      background: var(--btn-bg);
      border-radius: 8px;
      margin-bottom: 12px;
      border: 1px solid var(--btn-border);
    }

    .edit-form.active {
      display: block;
      animation: slideIn 0.3s ease;
    }

    .form-group {
      margin-bottom: 12px;
    }

    .form-group label {
      display: block;
      margin-bottom: 4px;
      color: var(--text-color);
      font-size: 14px;
    }

    .form-group input,
    .form-group textarea {
      width: 100%;
      padding: 8px;
      border: 1px solid var(--btn-border);
      border-radius: 4px;
      font-size: 14px;
      background: var(--bg-color);
      color: var(--text-color);
      box-sizing: border-box;
    }

    .form-group textarea {
      resize: vertical;
      min-height: 60px;
    }

    .form-group input:focus,
    .form-group textarea:focus {
      outline: none;
      border-color: var(--btn-hover-border);
      box-shadow: 0 0 0 2px var(--hover-shadow-color);
    }

    .edit-form .button-group {
      display: flex;
      gap: 8px;
      justify-content: flex-end;
      margin-top: 16px;
    }

    .edit-form .btn {
      padding: 8px 16px;
      border-radius: 4px;
      font-size: 14px;
      cursor: pointer;
      transition: all 0.2s ease;
    }

    .btn-primary {
      background: #0d6efd;
      color: white;
      border: none;
    }

    .btn-primary:hover {
      background: #0b5ed7;
    }

    .btn-secondary {
      background: var(--btn-bg);
      color: var(--btn-color);
      border: 1px solid var(--btn-border);
    }

    .btn-secondary:hover {
      background: var(--btn-hover-bg);
      border-color: var(--btn-hover-border);
    }

    @keyframes slideIn {
      from {
        opacity: 0;
        transform: translateY(10px);
      }
      to {
        opacity: 1;
        transform: translateY(0);
      }
    }

    @keyframes slideOut {
      from {
        opacity: 1;
        transform: translateY(0);
      }
      to {
        opacity: 0;
        transform: translateY(10px);
      }
    }

    .chat-item.pinned {
      border-color: var(--btn-hover-border);
      background: var(--btn-hover-bg);
    }

    .pin-btn {
      padding: 4px;
      border: none;
      background: none;
      color: var(--btn-color);
      cursor: pointer;
      border-radius: 4px;
      transition: all 0.2s ease;
      opacity: 0.7;
    }

    .pin-btn:hover {
      background: var(--btn-hover-bg);
      opacity: 1;
    }

    .favorite-chat[draggable="true"] {
      cursor: move;
    }

    .favorite-chat[draggable="true"] .chat-item {
      transition: transform 0.2s ease, box-shadow 0.2s ease;
    }

    .favorite-chat[draggable="true"]:hover .chat-item {
      transform: translateX(4px);
    }

    .favorite-chat.dragging .chat-item {
      opacity: 0.5;
      transform: scale(0.98);
    }

    .pinned-container {
      margin-bottom: 16px;
    }

    .pinned-container:empty {
      display: none;
    }

    .unpinned-container:empty {
      display: none;
    }
  `;
  document.head.appendChild(globalStyle);
  
  // Добавим сообщение, если нет избранных чатов
  function showNoFavorites() {
    favoritesList.innerHTML = '<div class="no-favorites">Нет сохраненных чатов</div>';
  }
  
  // Функция для отображения формы редактирования
  function showEditForm(favorite) {
    currentEditingId = favorite.timestamp;
    editTitle.value = favorite.title || '';
    editDescription.value = favorite.description || '';
    editForm.classList.add('active');
    editTitle.focus();
  }
  
  // Функция для скрытия формы редактирования
  function hideEditForm() {
    currentEditingId = null;
    editTitle.value = '';
    editDescription.value = '';
    editForm.classList.remove('active');
  }
  
  // Обработчик сохранения изменений
  saveEditBtn.addEventListener('click', () => {
    if (!currentEditingId) return;
    
    chrome.storage.sync.get(['favorites'], (result) => {
      const favorites = result.favorites || [];
      const index = favorites.findIndex(f => f.timestamp === currentEditingId);
      
      if (index !== -1) {
        favorites[index].title = editTitle.value.trim();
        favorites[index].description = editDescription.value.trim();
        
        chrome.storage.sync.set({ favorites }, () => {
          hideEditForm();
          renderFavorites(favorites);
        });
      }
    });
  });
  
  // Обработчик отмены редактирования
  cancelEditBtn.addEventListener('click', hideEditForm);
  
  // Функция для отображения списка избранного
  function renderFavorites(favorites) {
    if (favorites.length === 0) {
      showNoFavorites();
      return;
    }
    
    favoritesList.innerHTML = ''; // Очищаем список
    
    // Сортируем: сначала закрепленные (по порядку), потом остальные (по времени)
    favorites.sort((a, b) => {
      if (a.pinned && !b.pinned) return -1;
      if (!a.pinned && b.pinned) return 1;
      if (a.pinned && b.pinned) {
        return (a.pinnedOrder || 0) - (b.pinnedOrder || 0);
      }
      return new Date(b.timestamp) - new Date(a.timestamp);
    });

    // Создаем контейнер для закрепленных чатов
    const pinnedContainer = document.createElement('div');
    pinnedContainer.className = 'pinned-container';
    favoritesList.appendChild(pinnedContainer);

    // Создаем контейнер для обычных чатов
    const unpinnedContainer = document.createElement('div');
    unpinnedContainer.className = 'unpinned-container';
    favoritesList.appendChild(unpinnedContainer);

    // Функция обновления порядка закрепленных чатов
    function updatePinnedOrder() {
      const pinnedChats = Array.from(pinnedContainer.children);
      const newOrder = {};
      
      // Создаем новый порядок на основе текущих позиций
      pinnedChats.forEach((chat, index) => {
        const timestamp = chat.getAttribute('data-timestamp');
        newOrder[timestamp] = index;
      });

      // Обновляем избранное с новым порядком
      const newFavorites = favorites.map(f => ({
        ...f,
        pinnedOrder: f.pinned ? newOrder[f.timestamp] : undefined
      }));

      chrome.storage.sync.set({ favorites: newFavorites }, () => {
        favorites = newFavorites;
      });
    }
    
    favorites.forEach(favorite => {
      const chatElement = document.createElement('div');
      chatElement.className = 'favorite-chat';
      chatElement.setAttribute('data-timestamp', favorite.timestamp);
      
      if (favorite.pinned) {
        chatElement.setAttribute('draggable', 'true');
      }
      
      const chatTime = new Date(favorite.timestamp).toLocaleString('ru-RU', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
      
      chatElement.innerHTML = `
        <div class="chat-item ${favorite.pinned ? 'pinned' : ''}">
          <div class="chat-header">
            <a href="${favorite.url}" target="_blank" class="chat-title">
              ${favorite.pinned ? '📌 ' : ''}${favorite.title || 'Без названия'}
            </a>
            <div class="button-group">
              <button class="pin-btn" title="${favorite.pinned ? 'Открепить' : 'Закрепить'}">
                ${favorite.pinned ? '📌' : '📍'}
              </button>
              <button class="edit-btn" title="Редактировать">✎</button>
              <button class="delete-btn" title="Удалить">×</button>
            </div>
          </div>
          <div class="chat-time">${chatTime}</div>
          ${favorite.description ? `<div class="description">${favorite.description}</div>` : ''}
        </div>
      `;

      // Упрощенные обработчики для drag and drop
      if (favorite.pinned) {
        chatElement.addEventListener('dragstart', (e) => {
          e.dataTransfer.setData('text/plain', favorite.timestamp);
          chatElement.classList.add('dragging');
          chatElement.style.opacity = '0.5';
        });

        chatElement.addEventListener('dragend', () => {
          chatElement.classList.remove('dragging');
          chatElement.style.opacity = '1';
          updatePinnedOrder();
        });

        chatElement.addEventListener('dragover', (e) => {
          e.preventDefault();
          const draggingElement = document.querySelector('.dragging');
          if (!draggingElement || draggingElement === chatElement) return;

          const rect = chatElement.getBoundingClientRect();
          const midY = rect.top + rect.height / 2;
          
          if (e.clientY < midY) {
            pinnedContainer.insertBefore(draggingElement, chatElement);
          } else {
            pinnedContainer.insertBefore(draggingElement, chatElement.nextSibling);
          }
        });
      }
      
      // Обработчик закрепления
      chatElement.querySelector('.pin-btn').addEventListener('click', () => {
        const newPinned = !favorite.pinned;
        const newFavorites = favorites.map(f => {
          if (f.timestamp === favorite.timestamp) {
            return { 
              ...f, 
              pinned: newPinned,
              pinnedOrder: newPinned ? favorites.filter(x => x.pinned).length : undefined
            };
          }
          return f;
        });
        
        chrome.storage.sync.set({ favorites: newFavorites }, () => {
          favorites = newFavorites;
          renderFavorites(favorites);
        });
      });
      
      // Обработчик редактирования
      chatElement.querySelector('.edit-btn').addEventListener('click', () => {
        showEditForm(favorite);
      });
      
      // Обработчик удаления
      chatElement.querySelector('.delete-btn').addEventListener('click', () => {
        if (confirm('Вы уверены, что хотите удалить этот чат из избранного?')) {
          chatElement.style.animation = 'slideOut 0.3s ease forwards';
          setTimeout(() => {
            const newFavorites = favorites.filter(f => f.timestamp !== favorite.timestamp);
            chrome.storage.sync.set({ favorites: newFavorites }, () => {
              chatElement.remove();
              if (newFavorites.length === 0) {
                showNoFavorites();
              }
            });
          }, 300);
        }
      });
      
      // Добавляем в соответствующий контейнер
      if (favorite.pinned) {
        pinnedContainer.appendChild(chatElement);
      } else {
        unpinnedContainer.appendChild(chatElement);
      }
    });
  }
  
  // Загружаем сохраненные избранные чаты
  chrome.storage.sync.get(['favorites'], (result) => {
    console.log('Loaded favorites:', result.favorites);
    const favorites = result.favorites || [];
    renderFavorites(favorites);
  });

  // Функция для экспорта в .json файл
  function exportToJson(favorites) {
    const exportData = {
      version: "1.0",
      exportDate: new Date().toISOString(),
      favorites: favorites.map(favorite => ({
        title: favorite.title || 'Без названия',
        url: favorite.url,
        timestamp: favorite.timestamp,
        description: favorite.description || '',
        pinned: favorite.pinned || false,
        pinnedOrder: favorite.pinnedOrder
      }))
    };
    
    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `deepseek-favorites-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  // Функция для импорта из .json файла
  function importFromJson(content) {
    try {
      const importData = JSON.parse(content);
      
      // Проверяем структуру данных
      if (!importData.favorites || !Array.isArray(importData.favorites)) {
        throw new Error('Invalid file format: missing favorites array');
      }
      
      // Валидируем и нормализуем каждый элемент
      const validatedFavorites = importData.favorites.map(favorite => {
        if (!favorite.url) {
          throw new Error('Invalid favorite: missing URL');
        }
        
        return {
          title: favorite.title || 'Без названия',
          url: favorite.url,
          timestamp: favorite.timestamp || new Date().toISOString(),
          description: favorite.description || '',
          pinned: Boolean(favorite.pinned),
          pinnedOrder: favorite.pinnedOrder
        };
      });
      
      return validatedFavorites;
    } catch (error) {
      console.error('Error parsing import file:', error);
      alert('Ошибка при импорте файла. Убедитесь, что файл имеет правильный формат JSON.');
      return [];
    }
  }

  // Обработчик экспорта
  exportBtn.addEventListener('click', () => {
    chrome.storage.sync.get(['favorites'], (result) => {
      const favorites = result.favorites || [];
      exportToJson(favorites);
    });
  });

  // Обработчик импорта
  importFile.addEventListener('change', (event) => {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const content = e.target.result;
        const importedFavorites = importFromJson(content);
        
        if (importedFavorites.length === 0) return;

        chrome.storage.sync.get(['favorites'], (result) => {
          const currentFavorites = result.favorites || [];
          
          // Добавляем только те закладки, которых еще нет (проверка по URL)
          const newFavorites = [
            ...currentFavorites,
            ...importedFavorites.filter(imported => 
              !currentFavorites.some(current => current.url === imported.url)
            )
          ];

          chrome.storage.sync.set({ favorites: newFavorites }, () => {
            renderFavorites(newFavorites);
            alert(`Успешно импортировано ${
              importedFavorites.filter(imported => 
                !currentFavorites.some(current => current.url === imported.url)
              ).length
            } новых закладок`);
          });
        });
      } catch (error) {
        console.error('Error during import:', error);
        alert('Произошла ошибка при импорте. Проверьте консоль для деталей.');
      }
    };
    reader.readAsText(file);
  });

  // Функция для установки темы
  function setTheme(theme) {
    document.body.setAttribute('data-theme', theme);
    chrome.storage.sync.set({ theme: theme });
    
    // Обновляем активную кнопку
    lightThemeBtn.classList.toggle('active', theme === 'light');
    darkThemeBtn.classList.toggle('active', theme === 'dark');
  }

  // Загружаем сохраненную тему
  chrome.storage.sync.get(['theme'], (result) => {
    const savedTheme = result.theme || 'light';
    setTheme(savedTheme);
  });

  // Обработчики переключения темы
  lightThemeBtn.addEventListener('click', () => setTheme('light'));
  darkThemeBtn.addEventListener('click', () => setTheme('dark'));

  // Добавляем обработчик клика для кнопки импорта
  const importBtn = document.querySelector('button[for="importFile"]');
  importBtn.addEventListener('click', () => {
    document.getElementById('importFile').click();
  });
}); 