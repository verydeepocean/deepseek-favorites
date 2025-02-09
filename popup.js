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
  const favoritesTab = document.getElementById('favoritesTab');
  const promptsTab = document.getElementById('promptsTab');
  const favoritesSection = document.getElementById('favoritesSection');
  const promptsSection = document.getElementById('promptsSection');
  const promptSearchInput = document.getElementById('promptSearchInput');
  const addPromptBtn = document.getElementById('addPromptBtn');
  
  let currentEditingId = null;
  let currentFavorites = [];
  let currentPrompts = [];
  
  // Функция для установки темы
  function setTheme(theme) {
    document.body.setAttribute('data-theme', theme);
    chrome.storage.sync.set({ theme });
    
    if (theme === 'light') {
      lightThemeBtn.classList.add('active');
      darkThemeBtn.classList.remove('active');
    } else {
      darkThemeBtn.classList.add('active');
      lightThemeBtn.classList.remove('active');
    }
  }

  // Загружаем сохраненную тему
  chrome.storage.sync.get(['theme'], (result) => {
    const savedTheme = result.theme || 'light';
    setTheme(savedTheme);
  });

  // Обработчики переключения темы
  lightThemeBtn.addEventListener('click', () => setTheme('light'));
  darkThemeBtn.addEventListener('click', () => setTheme('dark'));
  
  // Добавляем стили для всего popup
  const globalStyle = document.createElement('style');
  globalStyle.textContent = `
    :root {
      --bg-color: #ffffff;
      --text-color: #2c3e50;
      --border-color: #e9ecef;
      --btn-bg: #f8f9fa;
      --btn-color: #495057;
      --btn-border: #dee2e6;
      --btn-hover-bg: #e9ecef;
      --btn-hover-border: #ced4da;
      --description-color: #6c757d;
      --time-color: #868e96;
      --shadow-color: rgba(0,0,0,0.05);
      --hover-shadow-color: rgba(0,0,0,0.1);
      --icon-size: 15px;
      --scrollbar-track: #f0f0f0;
      --scrollbar-thumb: #e0e0e0;
      --scrollbar-thumb-hover: #d0d0d0;
    }

    [data-theme="dark"] {
      --bg-color: #1a1d21;
      --text-color: #e9ecef;
      --border-color: #2d3339;
      --btn-bg: #2a2d31;
      --btn-color: #e9ecef;
      --btn-border: #3a3f44;
      --btn-hover-bg: #34383d;
      --btn-hover-border: #454b51;
      --description-color: #adb5bd;
      --time-color: #868e96;
      --shadow-color: rgba(0,0,0,0.3);
      --hover-shadow-color: rgba(0,0,0,0.4);
      --scrollbar-track: #1a1d21;
      --scrollbar-thumb: #2d3339;
      --scrollbar-thumb-hover: #3a3f44;
    }

    /* Стили для полос прокрутки */
    ::-webkit-scrollbar {
      width: 14px;
      height: 14px;
    }

    ::-webkit-scrollbar-track {
      background: var(--scrollbar-track);
      border-radius: 10px;
    }

    ::-webkit-scrollbar-thumb {
      background: var(--scrollbar-thumb);
      border: 2px solid var(--scrollbar-track);
      border-radius: 10px;
      transition: all 0.2s ease;
    }

    ::-webkit-scrollbar-thumb:hover {
      background: var(--scrollbar-thumb-hover);
    }

    /* Стили для Firefox */
    * {
      scrollbar-width: auto;
      scrollbar-color: var(--scrollbar-thumb) var(--scrollbar-track);
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

    .header-buttons {
      display: flex;
      gap: 4px;
      align-items: center;
    }

    .header-buttons-container {
      display: flex;
      flex-direction: column;
      gap: 4px;
    }

    .header-buttons-row {
      display: flex;
      gap: 4px;
    }

    .header-buttons-delete {
      display: flex;
      align-items: center;
      margin-left: 8px;
    }

    .lang-btn {
      font-size: 12px;
      font-weight: bold;
      width: 28px;
      height: 28px;
      padding: 0;
    }

    .clear-btn {
      color: #dc3545;
      border-color: #dc3545;
      width: 28px;
      height: 28px;
      padding: 0;
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

    /* Стили для модального окна промптов */
    .modal {
      display: none;
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background-color: rgba(0, 0, 0, 0.5);
      z-index: 1000;
    }

    .modal-content {
      position: relative;
      background-color: var(--btn-bg);
      margin: 15% auto;
      padding: 0;
      width: 80%;
      max-width: 500px;
      border-radius: 8px;
      box-shadow: 0 4px 12px var(--shadow-color);
      animation: slideDown 0.3s ease;
    }

    .modal-header {
      padding: 16px 20px;
      border-bottom: 1px solid var(--border-color);
      display: flex;
      justify-content: space-between;
      align-items: center;
    }

    .modal-header h2 {
      margin: 0;
      font-size: 18px;
      color: var(--text-color);
    }

    .close-btn {
      background: none;
      border: none;
      font-size: 24px;
      color: var(--btn-color);
      cursor: pointer;
      padding: 0;
      line-height: 1;
    }

    .close-btn:hover {
      color: var(--text-color);
    }

    .modal-body {
      padding: 20px;
    }

    .prompts-list {
      margin-bottom: 16px;
      max-height: 400px;
      overflow-y: auto;
    }

    .add-prompt-btn {
      width: 100%;
      padding: 12px;
      background: var(--btn-bg);
      border: 1px dashed var(--btn-border);
      border-radius: 4px;
      color: var(--btn-color);
      cursor: pointer;
      font-size: 14px;
      transition: all 0.2s ease;
    }

    .add-prompt-btn:hover {
      background: var(--btn-hover-bg);
      border-color: var(--btn-hover-border);
    }

    /* Стили для промптов */
    .prompt-item {
      padding: 12px;
      border: 1px solid var(--border-color);
      border-radius: 8px;
      margin-bottom: 8px;
      background: var(--btn-bg);
      transition: all 0.2s ease;
    }

    .prompt-item[draggable="true"] {
      cursor: move;
    }

    .prompt-item[draggable="true"]:hover {
      transform: translateX(4px);
    }

    .prompt-item.dragging {
      opacity: 0.5;
      transform: scale(0.98);
    }

    .pinned-container {
      margin-bottom: 16px;
      min-height: 8px;
    }

    .pinned-container:empty {
      padding: 8px;
      border: 1px dashed var(--border-color);
      border-radius: 8px;
      margin-bottom: 16px;
    }

    .unpinned-container:empty {
      display: none;
    }

    .prompt-title {
      font-weight: 500;
      margin-bottom: 4px;
      color: var(--text-color);
      font-size: 14px;
    }

    .prompt-text {
      font-size: 13px;
      color: var(--description-color);
      white-space: pre-wrap;
      margin-bottom: 8px;
      line-height: 1.4;
    }

    .prompt-actions {
      display: flex;
      gap: 8px;
      justify-content: flex-end;
    }

    .prompt-btn {
      padding: 4px 8px;
      border: 1px solid var(--btn-border);
      border-radius: 4px;
      background: var(--btn-bg);
      color: var(--btn-color);
      cursor: pointer;
      font-size: 13px;
      transition: all 0.2s ease;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 4px;
      white-space: nowrap;
    }

    .prompt-btn.pin-prompt {
      width: 32px;
      padding: 4px;
    }

    .prompt-btn:not(.pin-prompt) {
      min-width: 80px;
    }

    .prompt-btn:hover {
      background: var(--btn-hover-bg);
      border-color: var(--btn-hover-border);
    }

    .add-prompt-btn {
      width: 100%;
      padding: 12px;
      background: var(--btn-bg);
      border: 1px dashed var(--btn-border);
      border-radius: 4px;
      color: var(--btn-color);
      cursor: pointer;
      font-size: 14px;
      transition: all 0.2s ease;
      margin-top: 16px;
    }

    .add-prompt-btn:hover {
      background: var(--btn-hover-bg);
      border-color: var(--btn-hover-border);
    }

    #promptsList {
      margin-top: 16px;
    }

    .prompt-tags {
      margin: 8px 0;
      display: flex;
      flex-wrap: wrap;
      gap: 4px;
    }

    .prompt-tags .tag {
      font-size: 12px;
      color: var(--btn-color);
      background: var(--btn-bg);
      border: 1px solid var(--btn-border);
      padding: 2px 6px;
      border-radius: 4px;
      cursor: pointer;
      transition: all 0.2s ease;
    }

    .prompt-tags .tag:hover {
      background: var(--btn-hover-bg);
      border-color: var(--btn-hover-border);
    }

    .prompt-item {
      padding: 12px;
    }

    .popular-tags {
      margin: 8px 0 16px 0;
      padding: 0;
      display: flex;
      align-items: center;
      gap: 8px;
      flex-wrap: wrap;
    }

    .popular-tags-label {
      font-size: 12px;
      color: var(--description-color);
    }

    .popular-tags-list {
      display: flex;
      flex-wrap: wrap;
      gap: 4px;
    }

    .popular-tag {
      font-size: 12px;
      color: var(--btn-color);
      background: var(--btn-bg);
      border: 1px solid var(--btn-border);
      padding: 2px 6px;
      border-radius: 4px;
      cursor: pointer;
      transition: all 0.2s ease;
    }

    .popular-tag:hover {
      background: var(--btn-hover-bg);
      border-color: var(--btn-hover-border);
      transform: translateY(-1px);
    }

    .tabs {
      display: flex;
      gap: 12px;
    }

    .tab-btn {
      padding: 8px 16px;
      border: none;
      background: none;
      color: var(--btn-color);
      cursor: pointer;
      font-size: 15px;
      font-weight: 500;
      opacity: 0.7;
      transition: all 0.2s ease;
    }

    .tab-btn:hover {
      opacity: 1;
    }

    .tab-btn.active {
      color: var(--text-color);
      opacity: 1;
      font-weight: 600;
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
        <label for="editTitle_${favorite.timestamp}">Title</label>
        <input type="text" id="editTitle_${favorite.timestamp}" class="edit-title" placeholder="Enter title" value="${favorite.title || ''}">
      </div>
      <div class="form-group">
        <label for="editTags_${favorite.timestamp}">Tags</label>
        <input type="text" id="editTags_${favorite.timestamp}" class="edit-tags" placeholder="Add space-separated tags" value="${(favorite.tags || []).join(' ')}">
      </div>
      <div class="form-group">
        <label for="editDescription_${favorite.timestamp}">Description</label>
        <textarea id="editDescription_${favorite.timestamp}" class="edit-description" placeholder="Add chat description">${favorite.description || ''}</textarea>
      </div>
      <div class="button-group">
        <button type="button" class="btn btn-secondary cancel-edit" data-action="cancel">Cancel</button>
        <button type="button" class="btn btn-primary save-edit" data-action="save">Save</button>
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
      // Если запрос начинается с #, ищем только по тегам
      if (query.startsWith('#')) {
        const searchTag = query.slice(1); // Убираем # из запроса
        return favorite.tags && favorite.tags.some(tag => tag.toLowerCase() === searchTag);
      }
      
      // Иначе ищем по всем полям
      const titleMatch = (favorite.title || '').toLowerCase().includes(query);
      const descriptionMatch = (favorite.description || '').toLowerCase().includes(query);
      const tagMatch = favorite.tags && favorite.tags.some(tag => 
        tag.toLowerCase().includes(query) || 
        ('#' + tag.toLowerCase()).includes(query)
      );
      
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
      if (confirm('Are you sure you want to delete this chat from favorites?')) {
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
    
    // Обновляем популярные теги для избранного
    updatePopularTags(favorites, favoritesSection, searchInput);
    
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
    
    // Функция для обрезки текста по целому слову
    function truncateText(text, maxLength) {
      if (!text || text.length <= maxLength) return text;
      
      // Обрезаем до максимальной длины
      let truncated = text.substr(0, maxLength);
      
      // Находим последний пробел перед обрезкой
      const lastSpace = truncated.lastIndexOf(' ');
      
      // Обрезаем по последнему целому слову
      if (lastSpace > -1) {
        truncated = truncated.substr(0, lastSpace);
      }
      
      return truncated + '...';
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
      
      // Обрезаем описание до 120 символов
      const truncatedDescription = favorite.description ? truncateText(favorite.description, 120) : '';
      
      chatElement.innerHTML = `
        <div class="chat-item ${favorite.pinned ? 'pinned' : ''}">
          <div class="chat-header">
            <a href="${favorite.url}" target="_blank" class="chat-title">
              ${favorite.pinned ? '📌 ' : ''}${favorite.title || 'Untitled'}
            </a>
            <div class="button-group">
              <button type="button" class="pin-btn" title="${favorite.pinned ? 'Unpin' : 'Pin'}">${favorite.pinned ? '📌' : '📍'}</button>
              <button type="button" class="edit-btn" title="Edit">✎</button>
              <button type="button" class="delete-btn" title="Delete">×</button>
            </div>
          </div>
          <div class="chat-time">${chatTime}</div>
          ${truncatedDescription ? `<div class="description" title="${favorite.description}">${truncatedDescription}</div>` : ''}
          ${favorite.tags && favorite.tags.length > 0 ? 
            `<div class="prompt-tags">${favorite.tags.map(tag => `<span class="tag">#${tag}</span>`).join(' ')}</div>` 
            : ''}
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
  function exportToJson(favorites, prompts) {
    const exportData = {
      version: "1.0",
      exportDate: new Date().toISOString(),
      theme: document.body.getAttribute('data-theme') || 'light',
      favorites: favorites.map(favorite => ({
        title: favorite.title || 'Untitled',
        url: favorite.url,
        timestamp: favorite.timestamp,
        description: favorite.description || '',
        pinned: favorite.pinned || false,
        pinnedOrder: favorite.pinnedOrder,
        tags: favorite.tags || []
      })),
      prompts: prompts.map(prompt => ({
        id: prompt.id,
        title: prompt.title || 'Untitled',
        text: prompt.text,
        tags: prompt.tags || [],
        createdAt: prompt.createdAt,
        pinned: prompt.pinned || false,
        pinnedOrder: prompt.pinnedOrder
      }))
    };
    
    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `deepseek-backup-${new Date().toISOString().split('T')[0]}.json`;
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
      if (!importData.favorites && !importData.prompts) {
        throw new Error('Invalid file format: missing favorites or prompts array');
      }
      
      // Валидируем и нормализуем избранное
      let validatedFavorites = [];
      if (importData.favorites && Array.isArray(importData.favorites)) {
        validatedFavorites = importData.favorites.map(favorite => {
          if (!favorite.url) {
            throw new Error('Invalid favorite: missing URL');
          }
          
          return {
            title: favorite.title || 'Untitled',
            url: favorite.url,
            timestamp: favorite.timestamp || new Date().toISOString(),
            description: favorite.description || '',
            pinned: Boolean(favorite.pinned),
            pinnedOrder: favorite.pinnedOrder,
            tags: favorite.tags || []
          };
        });
      }

      // Валидируем и нормализуем промпты
      let validatedPrompts = [];
      if (importData.prompts && Array.isArray(importData.prompts)) {
        validatedPrompts = importData.prompts.map(prompt => {
          if (!prompt.text) {
            throw new Error('Invalid prompt: missing text');
          }
          
          return {
            id: prompt.id || Date.now().toString(),
            title: prompt.title || 'Untitled',
            text: prompt.text,
            tags: prompt.tags || [],
            createdAt: prompt.createdAt || new Date().toISOString(),
            pinned: Boolean(prompt.pinned),
            pinnedOrder: prompt.pinnedOrder
          };
        });
      }
      
      return {
        theme: importData.theme || 'light',
        favorites: validatedFavorites,
        prompts: validatedPrompts
      };
    } catch (error) {
      console.error('Error parsing import file:', error);
      alert('Ошибка при импорте файла. Убедитесь, что файл имеет правильный формат JSON.');
      return { theme: 'light', favorites: [], prompts: [] };
    }
  }

  // Обработчик экспорта
  exportBtn.addEventListener('click', () => {
    chrome.storage.sync.get(['favorites', 'prompts'], (result) => {
      const favorites = result.favorites || [];
      const prompts = result.prompts || [];
      exportToJson(favorites, prompts);
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
        const imported = importFromJson(content);
        
        if (imported.favorites.length === 0 && imported.prompts.length === 0) return;

        // Получаем текущие данные
        chrome.storage.sync.get(['favorites', 'prompts'], (result) => {
          const existingFavorites = result.favorites || [];
          const existingPrompts = result.prompts || [];

          // Находим новые закладки и промпты
          const newFavorites = imported.favorites.filter(imported => 
            !existingFavorites.some(current => current.url === imported.url)
          );
          const newPrompts = imported.prompts.filter(imported => 
            !existingPrompts.some(current => current.id === imported.id)
          );

          // Объединяем текущие и новые данные
          const updatedFavorites = [...existingFavorites, ...newFavorites];
          const updatedPrompts = [...existingPrompts, ...newPrompts];

          // Сохраняем обновленные данные и тему
          chrome.storage.sync.set({ 
            favorites: updatedFavorites,
            prompts: updatedPrompts,
            theme: imported.theme 
          }, () => {
            // Очищаем поля поиска
            searchInput.value = '';
            promptSearchInput.value = '';
            
            // Обновляем текущие данные в памяти
            currentFavorites = updatedFavorites;
            currentPrompts = updatedPrompts;
            
            // Обновляем тему
            setTheme(imported.theme);
            
            // Обновляем отображение
            renderFavorites(currentFavorites);
            renderPrompts(currentPrompts);

            // Показываем сообщение об успешном импорте
            let message = [];
            if (newFavorites.length > 0) {
              message.push(`${newFavorites.length} new favorites`);
            }
            if (newPrompts.length > 0) {
              message.push(`${newPrompts.length} new prompts`);
            }
            
            if (message.length > 0) {
              alert(`Successfully imported: ${message.join(' and ')}`);
            } else {
              alert('All imported items already exist in the list');
            }
          });
        });
      } catch (error) {
        console.error('Error during import:', error);
        alert('Error during import. Check console for details.');
      }
    };
    reader.readAsText(file);
    // Очищаем input file, чтобы можно было импортировать тот же файл повторно
    event.target.value = '';
  });

  // Функция для фильтрации промптов
  function filterPrompts(query) {
    chrome.storage.sync.get(['prompts'], (result) => {
      const prompts = result.prompts || [];
      query = query.toLowerCase().trim();
      
      if (!query) {
        renderPrompts(prompts);
        return;
      }

      const filtered = prompts.filter(prompt => {
        // Если запрос начинается с #, ищем только по тегам
        if (query.startsWith('#')) {
          const searchTag = query.slice(1); // Убираем # из запроса
          return prompt.tags && prompt.tags.some(tag => tag.toLowerCase() === searchTag);
        }
        
        // Иначе ищем по всем полям
        const titleMatch = prompt.title.toLowerCase().includes(query);
        const textMatch = prompt.text.toLowerCase().includes(query);
        const tagMatch = prompt.tags && prompt.tags.some(tag => 
          tag.toLowerCase().includes(query) || 
          ('#' + tag.toLowerCase()).includes(query)
        );
        
        return titleMatch || textMatch || tagMatch;
      });

      renderPrompts(filtered);
    });
  }

  // Добавляем обработчик поиска для промптов с debounce
  promptSearchInput.addEventListener('input', debounce((e) => {
    filterPrompts(e.target.value);
  }, 300));

  // Обновляем обработчик для тегов
  document.addEventListener('click', (e) => {
    const tag = e.target.closest('.tag');
    if (!tag) return;

    const section = tag.closest('.section');
    if (!section) return;

    const tagText = tag.textContent.trim(); // Получаем текст тега
    const searchQuery = tagText.startsWith('#') ? tagText : '#' + tagText; // Добавляем # если его нет
    
    if (section.id === 'promptsSection') {
      promptSearchInput.value = searchQuery;
      filterPrompts(searchQuery); // Сразу вызываем фильтрацию
    } else if (section.id === 'favoritesSection') {
      searchInput.value = searchQuery;
      filterFavorites(searchQuery); // Сразу вызываем фильтрацию
    }
  });

  // Добавляем обработчик кликов для кнопок промптов
  promptsList.addEventListener('click', (e) => {
    const button = e.target.closest('.prompt-btn');
    if (!button) return;

    const promptActions = button.closest('.prompt-actions');
    const promptId = promptActions.dataset.id;
    const promptElement = button.closest('.prompt-item');

    chrome.storage.sync.get(['prompts'], (result) => {
      const prompts = result.prompts || [];
      const prompt = prompts.find(p => p.id === promptId);
      
      if (!prompt) {
        console.error('Prompt not found:', promptId);
        return;
      }

      // Обработка клика по кнопке закрепления
      if (button.classList.contains('pin-prompt')) {
        const newPinned = !prompt.pinned;
        const newPrompts = prompts.map(p => {
          if (p.id === promptId) {
            return {
              ...p,
              pinned: newPinned,
              pinnedOrder: newPinned ? prompts.filter(x => x.pinned).length : undefined
            };
          }
          return p;
        });

        chrome.storage.sync.set({ prompts: newPrompts }, () => {
          renderPrompts(newPrompts);
        });
      }
      
      // Обработка клика по кнопке редактирования
      else if (button.classList.contains('edit-prompt')) {
        chrome.windows.create({
          url: 'prompt-editor.html?id=' + promptId,
          type: 'popup',
          width: 600,
          height: 500
        });
      }
      
      // Обработка клика по кнопке удаления
      else if (button.classList.contains('delete-prompt')) {
        if (confirm('Are you sure you want to delete this prompt?')) {
          const newPrompts = prompts.filter(p => p.id !== promptId);
          chrome.storage.sync.set({ prompts: newPrompts }, () => {
            renderPrompts(newPrompts);
          });
        }
      }
      
      // Обработка клика по кнопке копирования
      else if (button.classList.contains('copy-prompt')) {
        navigator.clipboard.writeText(prompt.text).then(() => {
          const originalText = button.textContent;
          button.textContent = '✓ Copied';
          setTimeout(() => {
            button.textContent = originalText;
          }, 2000);
        });
      }
    });
  });

  // Обработчик для кнопки добавления промпта
  addPromptBtn.addEventListener('click', () => {
    chrome.windows.create({
      url: 'prompt-editor.html',
      type: 'popup',
      width: 600,
      height: 500
    });
  });

  // Слушатель изменений в хранилище
  chrome.storage.onChanged.addListener((changes, namespace) => {
    if (namespace === 'sync' && changes.prompts) {
      // Обновляем список промптов только если открыта вкладка промптов
      if (promptsSection.classList.contains('active')) {
        renderPrompts(changes.prompts.newValue || []);
      }
    }
  });

  // Функция переключения вкладок
  function switchTab(tab, section) {
    // Убираем активный класс у всех вкладок и секций
    document.querySelectorAll('.tab-btn').forEach(t => t.classList.remove('active'));
    document.querySelectorAll('.section').forEach(s => s.classList.remove('active'));
    
    // Добавляем активный класс выбранной вкладке и секции
    tab.classList.add('active');
    section.classList.add('active');

    // Если открыта вкладка промптов, загружаем их
    if (section === promptsSection) {
      loadPrompts();
    }
  }

  // Обработчики переключения вкладок
  favoritesTab.addEventListener('click', () => switchTab(favoritesTab, favoritesSection));
  promptsTab.addEventListener('click', () => switchTab(promptsTab, promptsSection));

  // Загрузка промптов
  function loadPrompts() {
    chrome.storage.sync.get(['prompts'], (result) => {
      const prompts = result.prompts || [];
      renderPrompts(prompts);
    });
  }

  // Функция для обновления популярных тегов
  function updatePopularTags(prompts, container, searchInput, maxTags = 8) {
    // Создаем контейнер для популярных тегов, если его еще нет
    let popularTagsContainer = container.querySelector('.popular-tags');
    if (!popularTagsContainer) {
      popularTagsContainer = document.createElement('div');
      popularTagsContainer.className = 'popular-tags';
      // Вставляем после поля поиска
      searchInput.parentNode.after(popularTagsContainer);
    }

    // Собираем все теги и их частоту
    const tagFrequency = {};
    prompts.forEach(item => {
      if (item.tags) {
        item.tags.forEach(tag => {
          tagFrequency[tag] = (tagFrequency[tag] || 0) + 1;
        });
      }
    });

    // Сортируем теги по частоте и берем топ-N
    const popularTags = Object.entries(tagFrequency)
      .sort((a, b) => b[1] - a[1])
      .slice(0, maxTags)
      .map(([tag]) => tag);

    // Отображаем популярные теги
    popularTagsContainer.innerHTML = popularTags.length > 0
      ? `<div class="popular-tags-label">Popular tags:</div>
         <div class="popular-tags-list">
           ${popularTags.map(tag => `<span class="tag popular-tag">#${tag}</span>`).join('')}
         </div>`
      : '';
  }

  // Обновляем функцию renderPrompts
  function renderPrompts(prompts) {
    promptsList.innerHTML = '';
    
    // Обновляем популярные теги
    updatePopularTags(prompts, promptsSection, promptSearchInput);
    
    if (prompts.length === 0) {
      promptsList.innerHTML = '<div class="no-prompts">Нет сохраненных промптов</div>';
      return;
    }

    // Сортируем: сначала закрепленные, потом остальные
    const sortedPrompts = [...prompts].sort((a, b) => {
      if (a.pinned && !b.pinned) return -1;
      if (!a.pinned && b.pinned) return 1;
      if (a.pinned && b.pinned) {
        return (a.pinnedOrder || 0) - (b.pinnedOrder || 0);
      }
      return 0;
    });

    // Создаем контейнеры для закрепленных и обычных промптов
    const pinnedContainer = document.createElement('div');
    pinnedContainer.className = 'pinned-container';
    const unpinnedContainer = document.createElement('div');
    unpinnedContainer.className = 'unpinned-container';
    promptsList.appendChild(pinnedContainer);
    promptsList.appendChild(unpinnedContainer);

    // Функция обновления порядка закрепленных промптов
    function updatePinnedOrder() {
      const pinnedPrompts = Array.from(pinnedContainer.children);
      const newOrder = {};
      
      pinnedPrompts.forEach((prompt, index) => {
        const promptId = prompt.querySelector('.prompt-actions').dataset.id;
        newOrder[promptId] = index;
      });

      chrome.storage.sync.get(['prompts'], (result) => {
        const prompts = result.prompts || [];
        const newPrompts = prompts.map(p => ({
          ...p,
          pinnedOrder: p.pinned ? newOrder[p.id] : undefined
        }));

        chrome.storage.sync.set({ prompts: newPrompts });
      });
    }

    sortedPrompts.forEach(prompt => {
      const promptElement = document.createElement('div');
      promptElement.className = 'prompt-item';
      if (prompt.pinned) {
        promptElement.setAttribute('draggable', 'true');
      }
      
      // Обрезаем текст промпта до 120 символов
      const truncatedText = prompt.text.length > 120 ? 
        prompt.text.substring(0, 120) + '...' : 
        prompt.text;
      
      promptElement.innerHTML = `
        <div class="prompt-title">${prompt.pinned ? '📌 ' : ''}${prompt.title}</div>
        <div class="prompt-text" title="${prompt.text}">${truncatedText}</div>
        ${prompt.tags && prompt.tags.length > 0 ? 
          `<div class="prompt-tags">${prompt.tags.map(tag => `<span class="tag">#${tag}</span>`).join(' ')}</div>` 
          : ''}
        <div class="prompt-actions" data-id="${prompt.id}">
          <button class="prompt-btn pin-prompt" title="${prompt.pinned ? 'Unpin' : 'Pin'}">${prompt.pinned ? '📌' : '📍'}</button>
          <button class="prompt-btn edit-prompt">✎ Edit</button>
          <button class="prompt-btn delete-prompt">🗑️ Delete</button>
          <button class="prompt-btn copy-prompt">📋Copy Prompt</button>
        </div>
      `;

      // Добавляем обработчики для drag and drop
      if (prompt.pinned) {
        promptElement.addEventListener('dragstart', (e) => {
          e.dataTransfer.setData('text/plain', prompt.id);
          promptElement.classList.add('dragging');
          promptElement.style.opacity = '0.5';
        });

        promptElement.addEventListener('dragend', () => {
          promptElement.classList.remove('dragging');
          promptElement.style.opacity = '1';
          updatePinnedOrder();
        });

        promptElement.addEventListener('dragover', (e) => {
          e.preventDefault();
          const draggingElement = document.querySelector('.dragging');
          if (!draggingElement || draggingElement === promptElement) return;

          const rect = promptElement.getBoundingClientRect();
          const midY = rect.top + rect.height / 2;
          
          if (e.clientY < midY) {
            pinnedContainer.insertBefore(draggingElement, promptElement);
          } else {
            pinnedContainer.insertBefore(draggingElement, promptElement.nextSibling);
          }
        });
      }
      
      // Добавляем в соответствующий контейнер
      if (prompt.pinned) {
        pinnedContainer.appendChild(promptElement);
      } else {
        unpinnedContainer.appendChild(promptElement);
      }
    });
  }

  // Add click handler for import button
  const importBtn = document.querySelector('button[for="importFile"]');
  importBtn.addEventListener('click', () => {
    document.getElementById('importFile').click();
  });

  // Add click handler for clear data button
  clearDataBtn.addEventListener('click', () => {
    if (confirm('Are you sure you want to delete all data? This action cannot be undone.')) {
      chrome.storage.sync.clear(() => {
        if (chrome.runtime.lastError) {
          console.error('Error clearing data:', chrome.runtime.lastError);
          alert('Error clearing data.');
        } else {
          // Reset theme to light
          setTheme('light');
          
          // Clear all data
          currentFavorites = [];
          currentPrompts = [];
          
          // Clear search fields
          searchInput.value = '';
          promptSearchInput.value = '';
          
          // Remove popular tags containers
          const favoritesPopularTags = favoritesSection.querySelector('.popular-tags');
          const promptsPopularTags = promptsSection.querySelector('.popular-tags');
          if (favoritesPopularTags) favoritesPopularTags.remove();
          if (promptsPopularTags) promptsPopularTags.remove();
          
          // Update display
          renderFavorites([]);
          renderPrompts([]);
        }
      });
    }
  });
}); 