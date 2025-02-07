// Функция debounce для оптимизации производительности
function debounce(func, wait) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

document.addEventListener('DOMContentLoaded', () => {
  const favoritesList = document.getElementById('favoritesList');
  const editForm = document.getElementById('editForm');
  const editTitle = document.getElementById('editTitle');
  const editDescription = document.getElementById('editDescription');
  const editTags = document.getElementById('editTags');
  const saveEditBtn = document.getElementById('saveEdit');
  const cancelEditBtn = document.getElementById('cancelEdit');
  const exportBtn = document.getElementById('exportBtn');
  const importFile = document.getElementById('importFile');
  const lightThemeBtn = document.getElementById('lightTheme');
  const darkThemeBtn = document.getElementById('darkTheme');
  const clearDataBtn = document.getElementById('clearDataBtn');
  const searchInput = document.getElementById('searchInput');
  
  let currentEditingId = null;
  let currentFavorites = [];
  
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

    .clear-btn {
      margin-left: 8px;
      color: #dc3545;
      border-color: #dc3545;
    }

    .clear-btn:hover {
      background: #dc3545;
      border-color: #dc3545;
      color: white;
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
      margin: 0 0 12px 0;
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
      padding: 12px;
      background: var(--btn-bg);
      border-radius: 8px;
      margin-bottom: 8px;
      border: 1px solid var(--btn-border);
      animation: slideIn 0.3s ease;
      box-shadow: 0 2px 8px var(--shadow-color);
    }

    .edit-form .form-group {
      margin-bottom: 12px;
    }

    .edit-form .form-group:last-child {
      margin-bottom: 0;
    }

    .edit-form label {
      display: block;
      margin-bottom: 4px;
      color: var(--text-color);
      font-size: 14px;
    }

    .edit-form input,
    .edit-form textarea {
      width: 100%;
      padding: 8px;
      border: 1px solid var(--btn-border);
      border-radius: 4px;
      font-size: 14px;
      background: var(--bg-color);
      color: var(--text-color);
      box-sizing: border-box;
    }

    .edit-form textarea {
      resize: vertical;
      min-height: 60px;
    }

    .edit-form input:focus,
    .edit-form textarea:focus {
      outline: none;
      border-color: var(--btn-hover-border);
      box-shadow: 0 0 0 2px var(--hover-shadow-color);
    }

    .edit-form .button-group {
      display: flex;
      gap: 8px;
      justify-content: flex-end;
      margin-top: 12px;
    }

    .edit-form .btn {
      padding: 6px 12px;
      border-radius: 4px;
      font-size: 14px;
      cursor: pointer;
      transition: all 0.2s ease;
    }

    .edit-form .btn-primary {
      background: #0d6efd;
      color: white;
      border: none;
    }

    .edit-form .btn-primary:hover {
      background: #0b5ed7;
    }

    .edit-form .btn-secondary {
      background: var(--btn-bg);
      color: var(--btn-color);
      border: 1px solid var(--btn-border);
    }

    .edit-form .btn-secondary:hover {
      background: var(--btn-hover-bg);
      border-color: var(--btn-hover-border);
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
        transform: translateY(-10px);
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
        transform: translateY(-10px);
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

    .search-container {
      margin-bottom: 16px;
      padding: 0;
    }

    #searchInput {
      width: 100%;
      padding: 8px 12px;
      font-size: 14px;
      border: 1px solid var(--border-color);
      border-radius: 6px;
      background: var(--btn-bg);
      color: var(--text-color);
      transition: all 0.2s ease;
      box-sizing: border-box;
    }

    #searchInput:focus {
      outline: none;
      border-color: #0d6efd;
      box-shadow: 0 0 0 3px rgba(13, 110, 253, 0.15);
    }

    #searchInput::placeholder {
      color: var(--description-color);
      opacity: 0.7;
    }
  `;
  document.head.appendChild(globalStyle);
  
  // Добавим сообщение, если нет избранных чатов
  function showNoFavorites() {
    favoritesList.innerHTML = '<div class="no-favorites">Нет сохраненных чатов</div>';
  }
  
  // Функция для создания формы редактирования
  function createEditForm(favorite) {
    console.log('Creating edit form for favorite:', favorite);
    const form = document.createElement('div');
    form.className = 'edit-form';
    form.innerHTML = `
      <div class="form-group">
        <label for="editTitle_${favorite.timestamp}">Название</label>
        <input type="text" id="editTitle_${favorite.timestamp}" class="edit-title" placeholder="Введите название" value="${favorite.title || ''}">
      </div>
      <div class="form-group">
        <label for="editTags_${favorite.timestamp}">Теги</label>
        <input type="text" id="editTags_${favorite.timestamp}" class="edit-tags" placeholder="Добавьте теги через пробел" value="${(favorite.tags || []).join(' ')}">
      </div>
      <div class="form-group">
        <label for="editDescription_${favorite.timestamp}">Описание</label>
        <textarea id="editDescription_${favorite.timestamp}" class="edit-description" placeholder="Добавьте описание чата">${favorite.description || ''}</textarea>
      </div>
      <div class="button-group">
        <button type="button" class="btn btn-secondary cancel-edit" data-action="cancel">Отмена</button>
        <button type="button" class="btn btn-primary save-edit" data-action="save">Сохранить</button>
      </div>
    `;

    // Находим кнопки и поля ввода
    const saveButton = form.querySelector('[data-action="save"]');
    const cancelButton = form.querySelector('[data-action="cancel"]');
    const titleInput = form.querySelector('.edit-title');
    const tagsInput = form.querySelector('.edit-tags');
    const descriptionInput = form.querySelector('.edit-description');

    if (!saveButton || !cancelButton || !titleInput || !tagsInput || !descriptionInput) {
      console.error('Required form elements not found:', {
        saveButton,
        cancelButton,
        titleInput,
        tagsInput,
        descriptionInput
      });
      return null;
    }

    // Функция сохранения
    function handleSave() {
      console.log('Save button clicked');
      
      if (!titleInput || !tagsInput || !descriptionInput) {
        console.error('Form inputs not found');
        return;
      }

      const newTitle = titleInput.value.trim();
      const newTags = tagsInput.value.trim();
      const newDescription = descriptionInput.value.trim();
      
      console.log('Saving with values:', {
        title: newTitle,
        tags: newTags,
        description: newDescription,
        timestamp: favorite.timestamp
      });

      // Преобразуем теги в массив
      const tags = newTags
        .split(/\s+/)
        .filter(tag => tag.length > 0)
        .map(tag => tag.toLowerCase());
      
      // Создаем новый массив избранного
      const newFavorites = currentFavorites.map(f => {
        if (f.timestamp === favorite.timestamp) {
          return {
            ...f,
            title: newTitle,
            description: newDescription,
            tags: tags
          };
        }
        return f;
      });
      
      console.log('Saving new favorites:', newFavorites);
      
      // Сохраняем изменения
      chrome.storage.sync.set({ favorites: newFavorites }, () => {
        if (chrome.runtime.lastError) {
          console.error('Error saving changes:', chrome.runtime.lastError);
          alert('Произошла ошибка при сохранении изменений.');
          return;
        }
        
        console.log('Changes saved successfully');
        currentFavorites = newFavorites;
        hideEditForm();
        filterFavorites(searchInput.value);
      });
    }

    // Функция отмены
    function handleCancel() {
      console.log('Cancel button clicked');
      hideEditForm();
    }

    // Добавляем обработчики событий
    saveButton.addEventListener('click', handleSave);
    cancelButton.addEventListener('click', handleCancel);

    // Добавляем обработчик клавиш
    form.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && e.ctrlKey) {
        handleSave();
      } else if (e.key === 'Escape') {
        handleCancel();
      }
    });

    return form;
  }

  // Функция для отображения формы редактирования
  function showEditForm(chatElement, favorite) {
    console.log('Showing edit form for:', { chatElement, favorite });
    
    if (!chatElement || !favorite) {
      console.error('Invalid arguments for showEditForm:', { chatElement, favorite });
      return;
    }

    // Закрываем другие открытые формы
    const openForms = document.querySelectorAll('.edit-form');
    openForms.forEach(form => form.remove());
    
    currentEditingId = favorite.timestamp;
    const form = createEditForm(favorite);
    
    if (!form) {
      console.error('Failed to create edit form');
      return;
    }

    const chatItemElement = chatElement.querySelector('.chat-item');
    if (!chatItemElement) {
      console.error('Chat item element not found');
      return;
    }

    // Вставляем форму перед элементом чата
    chatItemElement.before(form);
    
    // Фокус на поле названия
    const titleInput = form.querySelector('.edit-title');
    if (titleInput) {
      titleInput.focus();
    } else {
      console.error('Title input not found in form');
    }
  }
  
  // Функция для скрытия формы редактирования
  function hideEditForm() {
    const forms = document.querySelectorAll('.edit-form');
    forms.forEach(form => {
      form.style.animation = 'slideOut 0.3s ease forwards';
      setTimeout(() => form.remove(), 300);
    });
    currentEditingId = null;
  }
  
  // Функция для фильтрации избранного
  function filterFavorites(query) {
    query = query.toLowerCase().trim();
    
    if (!query) {
      renderFavorites(currentFavorites);
      return;
    }

    const filtered = currentFavorites.filter(favorite => {
      const titleMatch = (favorite.title || '').toLowerCase().includes(query);
      const descriptionMatch = (favorite.description || '').toLowerCase().includes(query);
      const tagMatch = favorite.tags && favorite.tags.some(tag => tag.includes(query));
      
      return titleMatch || descriptionMatch || tagMatch;
    });

    renderFavorites(filtered);
  }

  // Добавляем обработчик поиска с debounce
  searchInput.addEventListener('input', debounce((e) => {
    filterFavorites(e.target.value);
  }, 300));
  
  // Добавляем обработчик событий на весь список для делегирования
  favoritesList.addEventListener('click', (e) => {
    console.log('Click event on favoritesList, target:', e.target);
    
    // Находим ближайшую кнопку от места клика
    const editBtn = e.target.closest('.edit-btn');
    const pinBtn = e.target.closest('.pin-btn');
    const deleteBtn = e.target.closest('.delete-btn');
    
    // Если клик не по кнопке - выходим
    if (!editBtn && !pinBtn && !deleteBtn) return;
    
    // Предотвращаем всплытие события
    e.preventDefault();
    e.stopPropagation();
    
    // Находим элемент чата и его timestamp
    const chatElement = (editBtn || pinBtn || deleteBtn).closest('.favorite-chat');
    const timestamp = chatElement.getAttribute('data-timestamp');
    const favorite = currentFavorites.find(f => f.timestamp === timestamp);
    
    if (!favorite) {
      console.error('Favorite not found for timestamp:', timestamp);
      return;
    }
    
    console.log('Processing click for favorite:', favorite);
    
    // Обработка клика по кнопке редактирования
    if (editBtn) {
      console.log('Edit button clicked for favorite:', favorite);
      showEditForm(chatElement, favorite);
    }
    
    // Обработка клика по кнопке закрепления
    if (pinBtn) {
      console.log('Pin button clicked for favorite:', favorite);
      const newPinned = !favorite.pinned;
      const newFavorites = currentFavorites.map(f => {
        if (f.timestamp === timestamp) {
          return { 
            ...f, 
            pinned: newPinned,
            pinnedOrder: newPinned ? currentFavorites.filter(x => x.pinned).length : undefined
          };
        }
        return f;
      });
      
      chrome.storage.sync.set({ favorites: newFavorites }, () => {
        currentFavorites = newFavorites;
        filterFavorites(searchInput.value);
      });
    }
    
    // Обработка клика по кнопке удаления
    if (deleteBtn) {
      console.log('Delete button clicked for favorite:', favorite);
      if (confirm('Вы уверены, что хотите удалить этот чат из избранного?')) {
        chatElement.style.animation = 'slideOut 0.3s ease forwards';
        setTimeout(() => {
          const newFavorites = currentFavorites.filter(f => f.timestamp !== timestamp);
          chrome.storage.sync.set({ favorites: newFavorites }, () => {
            currentFavorites = newFavorites;
            filterFavorites(searchInput.value);
          });
        }, 300);
      }
    }
  });

  // Функция для отображения списка избранного
  function renderFavorites(favorites) {
    if (!favorites || favorites.length === 0) {
      showNoFavorites();
      return;
    }
    
    favoritesList.innerHTML = '';
    
    // Сортируем: сначала закрепленные (по порядку), потом остальные (по времени)
    const sortedFavorites = [...favorites].sort((a, b) => {
      if (a.pinned && !b.pinned) return -1;
      if (!a.pinned && b.pinned) return 1;
      if (a.pinned && b.pinned) {
        return (a.pinnedOrder || 0) - (b.pinnedOrder || 0);
      }
      return new Date(b.timestamp) - new Date(a.timestamp);
    });

    // Создаем контейнеры
    const pinnedContainer = document.createElement('div');
    pinnedContainer.className = 'pinned-container';
    favoritesList.appendChild(pinnedContainer);

    const unpinnedContainer = document.createElement('div');
    unpinnedContainer.className = 'unpinned-container';
    favoritesList.appendChild(unpinnedContainer);

    // Функция обновления порядка закрепленных чатов
    function updatePinnedOrder() {
      const pinnedChats = Array.from(pinnedContainer.children);
      const newOrder = {};
      
      pinnedChats.forEach((chat, index) => {
        const timestamp = chat.getAttribute('data-timestamp');
        newOrder[timestamp] = index;
      });

      const newFavorites = currentFavorites.map(f => ({
        ...f,
        pinnedOrder: f.pinned ? newOrder[f.timestamp] : undefined
      }));

      chrome.storage.sync.set({ favorites: newFavorites }, () => {
        currentFavorites = newFavorites;
      });
    }
    
    sortedFavorites.forEach(favorite => {
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
              <button type="button" class="pin-btn" title="${favorite.pinned ? 'Открепить' : 'Закрепить'}">${favorite.pinned ? '📌' : '📍'}</button>
              <button type="button" class="edit-btn" title="Редактировать">✎</button>
              <button type="button" class="delete-btn" title="Удалить">×</button>
            </div>
          </div>
          <div class="chat-time">${chatTime}</div>
          ${favorite.tags && favorite.tags.length > 0 ? 
            `<div class="tags">${favorite.tags.map(tag => `<span class="tag">#${tag}</span>`).join(' ')}</div>` 
            : ''}
          ${favorite.description ? `<div class="description">${favorite.description}</div>` : ''}
        </div>
      `;
      
      // Обработчики для drag and drop
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
      
      // Добавляем в соответствующий контейнер
      if (favorite.pinned) {
        pinnedContainer.appendChild(chatElement);
      } else {
        unpinnedContainer.appendChild(chatElement);
      }
    });
  }
  
  // Обновляем загрузку избранных чатов
  chrome.storage.sync.get(['favorites'], (result) => {
    console.log('Loaded favorites:', result.favorites);
    currentFavorites = result.favorites || [];
    renderFavorites(currentFavorites);
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

        // Сохраняем текущую тему
        const currentTheme = document.body.getAttribute('data-theme') || 'light';

        // Находим новые закладки (которых еще нет)
        const newBookmarks = importedFavorites.filter(imported => 
          !currentFavorites.some(current => current.url === imported.url)
        );

        // Объединяем текущие и новые закладки
        const newFavorites = [...currentFavorites, ...newBookmarks];

        // Сначала обновляем локальное состояние и UI
        currentFavorites = newFavorites;
        renderFavorites(newFavorites);

        // Затем сохраняем в storage с сохранением темы
        chrome.storage.sync.set({ 
          favorites: newFavorites,
          theme: currentTheme 
        }, () => {
          searchInput.value = '';
          if (newBookmarks.length > 0) {
            alert(`Успешно импортировано ${newBookmarks.length} новых закладок`);
          } else {
            alert('Все импортированные закладки уже существуют в списке');
          }
        });

      } catch (error) {
        console.error('Error during import:', error);
        alert('Произошла ошибка при импорте. Проверьте консоль для деталей.');
      }
    };
    reader.readAsText(file);
    // Очищаем input file, чтобы можно было импортировать тот же файл повторно
    event.target.value = '';
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

  // Обновляем функцию очистки
  function clearAllData() {
    const confirmClear = confirm('Вы уверены, что хотите удалить все сохраненные данные? Это действие нельзя отменить.');
    
    if (confirmClear) {
      chrome.storage.sync.clear(() => {
        if (chrome.runtime.lastError) {
          console.error('Error clearing data:', chrome.runtime.lastError);
          alert('Произошла ошибка при очистке данных.');
        } else {
          setTheme('light');
          currentFavorites = [];
          searchInput.value = '';
          renderFavorites([]);
          alert('Все данные успешно удалены.');
        }
      });
    }
  }

  // Добавляем обработчик для кнопки очистки
  clearDataBtn.addEventListener('click', clearAllData);
}); 