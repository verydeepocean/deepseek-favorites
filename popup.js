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

// Функция для загрузки содержимого чата
async function loadChatContent(chatId) {
  try {
    // Загружаем метаданные о чанках
    const meta = await new Promise((resolve, reject) => {
      chrome.storage.local.get([`${chatId}_meta`], (result) => {
        if (chrome.runtime.lastError) {
          reject(chrome.runtime.lastError);
        } else {
          resolve(result[`${chatId}_meta`]);
        }
      });
    });

    if (!meta) {
      throw new Error('Chat content not found');
    }

    // Загружаем все чанки
    const chunkKeys = Array.from({ length: meta.chunks }, (_, i) => `${chatId}_chunk_${i}`);
    const chunks = await new Promise((resolve, reject) => {
      chrome.storage.local.get(chunkKeys, (result) => {
        if (chrome.runtime.lastError) {
          reject(chrome.runtime.lastError);
        } else {
          resolve(Object.values(result));
        }
      });
    });

    // Собираем чанки обратно в строку и парсим JSON
    const serialized = chunks.join('');
    return JSON.parse(serialized);
  } catch (error) {
    console.error('Error loading chat content:', error);
    throw error;
  }
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
  
  // Настройки по умолчанию
  const DEFAULT_SETTINGS = {
    provider: 'openrouter',
    apiKeys: {
      openrouter: '',
      google: ''
    },
    model: '',
    titlePrompt: 'Come up with a name for this chat up to 50 characters. Short, clear and concise. Capture only the essence. The language of the name should match the language of the chat. Return only the name without quotes: {text}',
    summaryPrompt: 'Please generate a concise summary of this chat conversation in 2-3 sentences: {text}'
  };

  // Элементы настроек
  const settingsBtn = document.getElementById('settingsBtn');
  const settingsModal = document.getElementById('settingsModal');
  const closeButtons = settingsModal.querySelectorAll('.settings-close');
  const saveSettingsBtn = document.getElementById('saveSettings');
  const providerSelect = document.getElementById('provider');
  const apiKeyInput = document.getElementById('apiKey');
  const modelSelect = document.getElementById('model');
  const summaryPromptInput = document.getElementById('summaryPrompt');
  const titlePromptInput = document.getElementById('titlePrompt');

  // Модели для каждого провайдера
  const PROVIDER_MODELS = {
    openrouter: [
      { value: 'google/gemini-2.0-flash-001', label: 'gemini-2.0-flash-001' },
      { value: 'deepseek/deepseek-chat', label: 'DeepSeek-V3' },
      { value: 'openai/gpt-4o-mini', label: 'GPT-4o mini' },
      { value: 'meta-llama/llama-3.3-70b-instruct', label: 'The Meta Llama 3.3' }
    ],
    google: [
      { value: 'gemini-2.0-flash-001', label: 'gemini-2.0-flash-001' },
      { value: 'gemini-2.0-flash-lite-preview-02-05', label: 'gemini-2.0-flash-lite-preview-02-05' },
      { value: 'gemini-2.0-pro-exp-02-05', label: 'gemini-2.0-pro-exp-02-05' },
      { value: 'gemini-2.0-flash-thinking-exp-01-21', label: 'gemini-2.0-flash-thinking-exp-01-21' },
      { value: 'gemini-2.0-flash-exp', label: 'gemini-2.0-flash-exp' }
    ]
  };

  // Функция для обновления списка моделей в зависимости от провайдера
  function updateModelsList(provider) {
    const models = PROVIDER_MODELS[provider];
    const modelSelect = document.getElementById('model');
    
    // Очищаем текущий список
    modelSelect.innerHTML = '';
    
    // Добавляем новые опции
    models.forEach(model => {
      const option = document.createElement('option');
      option.value = model.value;
      option.textContent = model.label;
      modelSelect.appendChild(option);
    });

    // Устанавливаем первую модель как выбранную по умолчанию
    if (models.length > 0) {
      modelSelect.value = models[0].value;
    }
  }

  // Добавляем функцию проверки соединения
  let lastSavedSettings = null;

  // Сохранение настроек
  async function saveSettings() {
    const currentProvider = providerSelect.value;
    
    // Получаем текущие настройки для сохранения всех API ключей
    const currentSettings = await new Promise(resolve => {
      chrome.storage.sync.get(['settings'], result => {
        resolve(result.settings || DEFAULT_SETTINGS);
      });
    });

    const settings = {
      provider: currentProvider,
      apiKeys: {
        ...currentSettings.apiKeys,
        [currentProvider]: apiKeyInput.value.trim()
      },
      model: modelSelect.value,
      titlePrompt: titlePromptInput.value.trim() || DEFAULT_SETTINGS.titlePrompt,
      summaryPrompt: summaryPromptInput.value.trim() || DEFAULT_SETTINGS.summaryPrompt
    };

    // Проверка наличия API ключа для текущего провайдера
    if (!settings.apiKeys[currentProvider]) {
      showNotification('Please enter your API key', true);
      apiKeyInput.focus();
      return;
    }

    try {
      await chrome.storage.sync.set({ settings });
      lastSavedSettings = settings;
      showNotification('Settings saved successfully! 🎉');
      settingsModal.classList.remove('active');
    } catch (error) {
      console.error('Error saving settings:', error);
      showNotification('Failed to save settings. Please try again.', true);
    }
  }

  // Функция для показа уведомлений
  function showNotification(message, isError = false) {
    const notification = document.createElement('div');
    notification.textContent = message;
    notification.style.cssText = `
      position: fixed;
      bottom: 20px;
      right: 20px;
      padding: 12px 24px;
      background: ${isError ? '#dc3545' : '#198754'};
      color: white;
      border-radius: 4px;
      font-size: 14px;
      z-index: 1000;
      opacity: 0;
      transform: translateY(10px);
      transition: all 0.3s ease;
    `;
    
    document.body.appendChild(notification);
    
    // Анимация появления
    setTimeout(() => {
      notification.style.opacity = '1';
      notification.style.transform = 'translateY(0)';
    }, 100);
    
    // Удаление через 3 секунды
    setTimeout(() => {
      notification.style.opacity = '0';
      notification.style.transform = 'translateY(10px)';
      setTimeout(() => notification.remove(), 300);
    }, 3000);
  }

  // Обработчики событий для настроек
  settingsBtn.addEventListener('click', () => {
    loadSettings();
    settingsModal.classList.add('active');
  });

  // Закрытие окна настроек
  closeButtons.forEach(button => {
    button.addEventListener('click', () => {
      // Восстанавливаем последние сохраненные настройки
      if (lastSavedSettings) {
        // Восстанавливаем значения полей
        providerSelect.value = lastSavedSettings.provider;
        updateModelsList(lastSavedSettings.provider);
        apiKeyInput.value = lastSavedSettings.apiKeys[lastSavedSettings.provider] || '';
        modelSelect.value = lastSavedSettings.model;
        titlePromptInput.value = lastSavedSettings.titlePrompt;
        summaryPromptInput.value = lastSavedSettings.summaryPrompt;
      }
      settingsModal.classList.remove('active');
    });
  });

  // Закрытие по клику вне окна
  settingsModal.addEventListener('click', (e) => {
    if (e.target === settingsModal) {
      // Восстанавливаем последние сохраненные настройки
      if (lastSavedSettings) {
        // Восстанавливаем значения полей
        providerSelect.value = lastSavedSettings.provider;
        updateModelsList(lastSavedSettings.provider);
        apiKeyInput.value = lastSavedSettings.apiKeys[lastSavedSettings.provider] || '';
        modelSelect.value = lastSavedSettings.model;
        titlePromptInput.value = lastSavedSettings.titlePrompt;
        summaryPromptInput.value = lastSavedSettings.summaryPrompt;
      }
      settingsModal.classList.remove('active');
    }
  });

  // Добавляем обработчик клавиш для формы настроек
  settingsModal.addEventListener('keydown', async (e) => {
    if (e.key === 'Enter' && e.ctrlKey) {
      await saveSettings();
    } else if (e.key === 'Escape') {
      // Восстанавливаем последние сохраненные настройки
      if (lastSavedSettings) {
        await chrome.storage.sync.set({ settings: lastSavedSettings });
        loadSettings();
      }
        settingsModal.classList.remove('active');
    }
  });

  saveSettingsBtn.addEventListener('click', saveSettings);

  // Функция для генерации саммари
  async function generateSummary(text) {
    try {
      const settings = await new Promise(resolve => {
        chrome.storage.sync.get(['settings'], result => {
          resolve(result.settings || DEFAULT_SETTINGS);
        });
      });

      if (!settings.apiKeys[settings.provider]) {
        throw new Error('API key not found. Please add it in Settings.');
      }

      let response;
      let summary;

      if (settings.provider === 'google') {
        // Используем Google AI API
        const apiVersion = settings.model === 'gemini-pro' ? 'v1' : 'v1beta';
        const modelId = settings.model === 'gemini-pro' ? 'gemini-pro' : settings.model;
        
        response = await fetch(`https://generativelanguage.googleapis.com/${apiVersion}/models/${modelId}:generateContent?key=${settings.apiKeys[settings.provider]}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            contents: [{
              parts: [{
                text: settings.summaryPrompt.replace('{text}', text)
              }]
            }]
          })
        });

        if (!response.ok) {
          const error = await response.json();
          console.error('Google AI API error:', error);
          throw new Error(error.error?.message || 'Failed to generate summary');
        }

        const data = await response.json();
        console.log('Google AI API response:', data);

        if (!data.candidates || !data.candidates[0] || !data.candidates[0].content) {
          console.error('Invalid Google AI response format:', data);
          throw new Error('Invalid response format from Google AI');
        }

        const content = data.candidates[0].content;
        if (!content.parts || !content.parts[0] || !content.parts[0].text) {
          console.error('Missing text in Google AI response:', content);
          throw new Error('No text generated from Google AI');
        }

        summary = content.parts[0].text;
      } else {
        // Используем OpenRouter API
        response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${settings.apiKeys[settings.provider]}`,
            'HTTP-Referer': 'https://github.com/your-username/deepseek-favorites',
          'X-Title': 'DeepSeek Favorites Extension'
        },
        body: JSON.stringify({
          model: settings.model,
          messages: [
            {
              role: 'user',
              content: settings.summaryPrompt.replace('{text}', text)
            }
          ]
        })
      });

      if (!response.ok) {
        const error = await response.json();
          console.error('OpenRouter API error:', error);
          throw new Error(error.message || `API error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
        console.log('OpenRouter API response:', data);

        if (!data || !data.choices) {
          console.error('Invalid API response format:', data);
          throw new Error('Invalid API response format - missing choices array');
        }

        if (data.choices.length === 0) {
          console.error('Empty choices array in response:', data);
          throw new Error('No response generated from the model');
        }

        const firstChoice = data.choices[0];
        if (!firstChoice || !firstChoice.message) {
          console.error('Invalid choice format:', firstChoice);
          throw new Error('Invalid response format - missing message');
        }

        summary = firstChoice.message.content;
        if (!summary) {
          console.error('Empty content in response:', firstChoice);
          throw new Error('Empty response from the model');
        }
      }

      return summary;
    } catch (error) {
      console.error('Error generating summary:', error);
      throw new Error(`Failed to generate summary: ${error.message}`);
    }
  }

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

    /* Settings Modal Styles */
    .settings-modal {
      display: none;
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: rgba(0, 0, 0, 0.5);
      z-index: 1000;
    }

    .settings-modal.active {
      display: block;
    }

    .settings-content {
      position: relative;
      background: var(--bg-color);
      margin: 15% auto;
      width: 90%;
      max-width: 500px;
      border-radius: 8px;
      box-shadow: 0 4px 12px var(--shadow-color);
      animation: slideDown 0.3s ease;
      border: 1px solid var(--border-color);
    }

    .settings-header {
      padding: 1px 20px;
      border-bottom: 1px solid var(--border-color);
      display: flex;
      justify-content: space-between;
      align-items: center;
    }

    .settings-title {
      margin: 0;
      font-size: 18px;
      color: var(--text-color);
      font-weight: 500;
    }

    .settings-close {
      background: none;
      border: none;
      font-size: 24px;
      color: var(--btn-color);
      cursor: pointer;
      padding: 0;
      line-height: 1;
      opacity: 0.7;
      transition: opacity 0.2s ease;
    }

    .settings-close:hover {
      opacity: 1;
    }

    .settings-form {
      padding: 0 20px 20px 20px;
    }

    .settings-group {
      margin-bottom: 0px;
    }

    .settings-group:last-child {
      margin-bottom: 0;
    }

    .settings-group label {
      display: block;
      margin-bottom: 8px;
      color: var(--text-color);
      font-size: 14px;
      font-weight: 500;
    }

    .settings-group select,
    .settings-group input,
    .settings-group textarea {
      width: 100%;
      padding: 8px 12px;
      border: 1px solid var(--border-color);
      border-radius: 6px;
      background: var(--btn-bg);
      color: var(--text-color);
      font-size: 14px;
      transition: all 0.2s ease;
      box-sizing: border-box;
    }

    .settings-group textarea {
      min-height: 120px;
      resize: vertical;
    }

    .settings-group select:focus,
    .settings-group input:focus,
    .settings-group textarea:focus {
      outline: none;
      border-color: #0d6efd;
      box-shadow: 0 0 0 3px rgba(13, 110, 253, 0.15);
    }

    .settings-group select:hover,
    .settings-group input:hover,
    .settings-group textarea:hover {
      border-color: var(--btn-hover-border);
    }

    .settings-actions {
      display: flex;
      justify-content: center;
      gap: 8px;
      margin-top: 20px;
      padding-top: 16px;
      border-top: 1px solid var(--border-color);
      position: sticky;
      bottom: 40px;
      background: var(--bg-color);
      padding-bottom: 10px;
    }

    .settings-actions button {
      padding: 8px 16px;
      border-radius: 6px;
      font-size: 14px;
      font-weight: 500;
      cursor: pointer;
      transition: all 0.2s ease;
      flex: 1;
      max-width: 150px;
      min-height: 50px;
    }

    .settings-actions .btn-secondary {
      background: var(--btn-bg);
      color: var(--btn-color);
      border: 1px solid var(--btn-border);
    }

    .settings-actions .btn-secondary:hover {
      background: var(--btn-hover-bg);
      border-color: var(--btn-hover-border);
    }

    .settings-actions .btn-primary {
      background: var(--btn-bg);
      color: var(--text-color);
      border: 1px solid var(--border-color);
    }

    .settings-actions .btn-primary:hover {
      background: var(--btn-hover-bg);
      border-color: var(--btn-hover-border);
    }

    @keyframes slideDown {
      from {
        opacity: 0;
        transform: translateY(-20px);
      }
      to {
        opacity: 1;
        transform: translateY(0);
      }
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

    .label-with-button {
      display: flex;
      align-items: center;
      gap: 8px;
      margin-bottom: 4px;
    }

    .generate-btn {
      padding: 2px 6px;
      border: 1px solid var(--btn-border);
      border-radius: 4px;
      background: var(--btn-bg);
      color: var(--btn-color);
      cursor: pointer;
      font-size: 12px;
      transition: all 0.2s ease;
      display: inline-flex;
      align-items: center;
      justify-content: center;
    }

    .generate-btn:hover {
      background: var(--btn-hover-bg);
      border-color: var(--btn-hover-border);
    }

    .generate-btn:disabled {
      opacity: 0.7;
      cursor: not-allowed;
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
      min-height: 120px;
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

    /* Settings Modal Styles */
    .settings-modal {
      display: none;
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: rgba(0, 0, 0, 0.5);
      z-index: 1000;
    }

    .settings-modal.active {
      display: block;
    }

    .settings-content {
      position: relative;
      background: var(--bg-color);
      margin: 15% auto;
      width: 90%;
      max-width: 500px;
      border-radius: 8px;
      box-shadow: 0 4px 12px var(--shadow-color);
      animation: slideDown 0.3s ease;
      border: 1px solid var(--border-color);
    }

    .settings-header {
      padding: 1px 20px;
      border-bottom: 1px solid var(--border-color);
      display: flex;
      justify-content: space-between;
      align-items: center;
    }

    .settings-title {
      margin: 0;
      font-size: 18px;
      color: var(--text-color);
      font-weight: 500;
    }

    .settings-close {
      background: none;
      border: none;
      font-size: 24px;
      color: var(--btn-color);
      cursor: pointer;
      padding: 0;
      line-height: 1;
      opacity: 0.7;
      transition: opacity 0.2s ease;
    }

    .settings-close:hover {
      opacity: 1;
    }

    .settings-form {
      padding: 0 20px 20px 20px;
    }

    .settings-group {
      margin-bottom: 0px;
    }

    .settings-group:last-child {
      margin-bottom: 0;
    }

    .settings-group label {
      display: block;
      margin-bottom: 8px;
      color: var(--text-color);
      font-size: 14px;
      font-weight: 500;
    }

    .settings-group select,
    .settings-group input,
    .settings-group textarea {
      width: 100%;
      padding: 8px 12px;
      border: 1px solid var(--border-color);
      border-radius: 6px;
      background: var(--btn-bg);
      color: var(--text-color);
      font-size: 14px;
      transition: all 0.2s ease;
      box-sizing: border-box;
    }

    .settings-group textarea {
      min-height: 120px;
      resize: vertical;
    }

    .settings-group select:focus,
    .settings-group input:focus,
    .settings-group textarea:focus {
      outline: none;
      border-color: #0d6efd;
      box-shadow: 0 0 0 3px rgba(13, 110, 253, 0.15);
    }

    .settings-group select:hover,
    .settings-group input:hover,
    .settings-group textarea:hover {
      border-color: var(--btn-hover-border);
    }

    .settings-actions {
      display: flex;
      justify-content: center;
      gap: 8px;
      margin-top: 20px;
      padding-top: 16px;
      border-top: 1px solid var(--border-color);
      position: sticky;
      bottom: 40px;
      background: var(--bg-color);
      padding-bottom: 10px;
    }

    .settings-actions button {
      padding: 8px 16px;
      border-radius: 6px;
      font-size: 14px;
      font-weight: 500;
      cursor: pointer;
      transition: all 0.2s ease;
      flex: 1;
      max-width: 150px;
      min-height: 50px;
    }

    .settings-actions .btn-secondary {
      background: var(--btn-bg);
      color: var(--btn-color);
      border: 1px solid var(--btn-border);
    }

    .settings-actions .btn-secondary:hover {
      background: var(--btn-hover-bg);
      border-color: var(--btn-hover-border);
    }

    .settings-actions .btn-primary {
      background: var(--btn-bg);
      color: var(--text-color);
      border: 1px solid var(--border-color);
    }

    .settings-actions .btn-primary:hover {
      background: var(--btn-hover-bg);
      border-color: var(--btn-hover-border);
    }

    @keyframes slideDown {
      from {
        opacity: 0;
        transform: translateY(-20px);
      }
      to {
        opacity: 1;
        transform: translateY(0);
      }
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

    .label-with-button {
      display: flex;
      align-items: center;
      gap: 8px;
      margin-bottom: 4px;
    }

    .generate-btn {
      padding: 2px 6px;
      border: 1px solid var(--btn-border);
      border-radius: 4px;
      background: var(--btn-bg);
      color: var(--btn-color);
      cursor: pointer;
      font-size: 12px;
      transition: all 0.2s ease;
      display: inline-flex;
      align-items: center;
      justify-content: center;
    }

    .generate-btn:hover {
      background: var(--btn-hover-bg);
      border-color: var(--btn-hover-border);
    }

    .generate-btn:disabled {
      opacity: 0.7;
      cursor: not-allowed;
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
      min-height: 120px;
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

    /* Settings Modal Styles */
    .settings-modal {
      display: none;
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: rgba(0, 0, 0, 0.5);
      z-index: 1000;
    }

    .settings-modal.active {
      display: block;
    }

    .settings-content {
      position: relative;
      background: var(--bg-color);
      margin: 15% auto;
      width: 90%;
      max-width: 500px;
      border-radius: 8px;
      box-shadow: 0 4px 12px var(--shadow-color);
      animation: slideDown 0.3s ease;
      border: 1px solid var(--border-color);
    }

    .settings-header {
      padding: 1px 20px;
      border-bottom: 1px solid var(--border-color);
      display: flex;
      justify-content: space-between;
      align-items: center;
    }

    .settings-title {
      margin: 0;
      font-size: 18px;
      color: var(--text-color);
      font-weight: 500;
    }

    .settings-close {
      background: none;
      border: none;
      font-size: 24px;
      color: var(--btn-color);
      cursor: pointer;
      padding: 0;
      line-height: 1;
      opacity: 0.7;
      transition: opacity 0.2s ease;
    }

    .settings-close:hover {
      opacity: 1;
    }

    .settings-form {
      padding: 0 20px 20px 20px;
    }

    .settings-group {
      margin-bottom: 0px;
    }

    .settings-group:last-child {
      margin-bottom: 0;
    }

    .settings-group label {
      display: block;
      margin-bottom: 8px;
      color: var(--text-color);
      font-size: 14px;
      font-weight: 500;
    }

    .settings-group select,
    .settings-group input,
    .settings-group textarea {
      width: 100%;
      padding: 8px 12px;
      border: 1px solid var(--border-color);
      border-radius: 6px;
      background: var(--btn-bg);
      color: var(--text-color);
      font-size: 14px;
      transition: all 0.2s ease;
      box-sizing: border-box;
    }

    .settings-group textarea {
      min-height: 120px;
      resize: vertical;
    }

    .settings-group select:focus,
    .settings-group input:focus,
    .settings-group textarea:focus {
      outline: none;
      border-color: #0d6efd;
      box-shadow: 0 0 0 3px rgba(13, 110, 253, 0.15);
    }

    .settings-group select:hover,
    .settings-group input:hover,
    .settings-group textarea:hover {
      border-color: var(--btn-hover-border);
    }

    .settings-actions {
      display: flex;
      justify-content: center;
      gap: 8px;
      margin-top: 20px;
      padding-top: 16px;
      border-top: 1px solid var(--border-color);
      position: sticky;
      bottom: 40px;
      background: var(--bg-color);
      padding-bottom: 10px;
    }

    .settings-actions button {
      padding: 8px 16px;
      border-radius: 6px;
      font-size: 14px;
      font-weight: 500;
      cursor: pointer;
      transition: all 0.2s ease;
      flex: 1;
      max-width: 150px;
      min-height: 50px;
    }

    .settings-actions .btn-secondary {
      background: var(--btn-bg);
      color: var(--btn-color);
      border: 1px solid var(--btn-border);
    }

    .settings-actions .btn-secondary:hover {
      background: var(--btn-hover-bg);
      border-color: var(--btn-hover-border);
    }

    .settings-actions .btn-primary {
      background: var(--btn-bg);
      color: var(--text-color);
      border: 1px solid var(--border-color);
    }

    .settings-actions .btn-primary:hover {
      background: var(--btn-hover-bg);
      border-color: var(--btn-hover-border);
    }

    @keyframes slideDown {
      from {
        opacity: 0;
        transform: translateY(-20px);
      }
      to {
        opacity: 1;
        transform: translateY(0);
      }
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

    .label-with-button {
      display: flex;
      align-items: center;
      gap: 8px;
      margin-bottom: 4px;
    }

    .generate-btn {
      padding: 2px 6px;
      border: 1px solid var(--btn-border);
      border-radius: 4px;
      background: var(--btn-bg);
      color: var(--btn-color);
      cursor: pointer;
      font-size: 12px;
      transition: all 0.2s ease;
      display: inline-flex;
      align-items: center;
      justify-content: center;
    }

    .generate-btn:hover {
      background: var(--btn-hover-bg);
      border-color: var(--btn-hover-border);
    }

    .generate-btn:disabled {
      opacity: 0.7;
      cursor: not-allowed;
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
      min-height: 120px;
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

    /* Settings Modal Styles */
    .settings-modal {
      display: none;
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: rgba(0, 0, 0, 0.5);
      z-index: 1000;
    }

    .settings-modal.active {
      display: block;
    }

    .settings-content {
      position: relative;
      background: var(--bg-color);
      margin: 15% auto;
      width: 90%;
      max-width: 500px;
      border-radius: 8px;
      box-shadow: 0 4px 12px var(--shadow-color);
      animation: slideDown 0.3s ease;
      border: 1px solid var(--border-color);
    }

    .settings-header {
      padding: 1px 20px;
      border-bottom: 1px solid var(--border-color);
      display: flex;
      justify-content: space-between;
      align-items: center;
    }

    .settings-title {
      margin: 0;
      font-size: 18px;
      color: var(--text-color);
      font-weight: 500;
    }

    .settings-close {
      background: none;
      border: none;
      font-size: 24px;
      color: var(--btn-color);
      cursor: pointer;
      padding: 0;
      line-height: 1;
      opacity: 0.7;
      transition: opacity 0.2s ease;
    }

    .settings-close:hover {
      opacity: 1;
    }

    .settings-form {
      padding: 0 20px 20px 20px;
    }

    .settings-group {
      margin-bottom: 0px;
    }

    .settings-group:last-child {
      margin-bottom: 0;
    }

    .settings-group label {
      display: block;
      margin-bottom: 8px;
      color: var(--text-color);
      font-size: 14px;
      font-weight: 500;
    }

    .settings-group select,
    .settings-group input,
    .settings-group textarea {
      width: 100%;
      padding: 8px 12px;
      border: 1px solid var(--border-color);
      border-radius: 6px;
      background: var(--btn-bg);
      color: var(--text-color);
      font-size: 14px;
      transition: all 0.2s ease;
      box-sizing: border-box;
    }

    .settings-group textarea {
      min-height: 120px;
      resize: vertical;
    }

    .settings-group select:focus,
    .settings-group input:focus,
    .settings-group textarea:focus {
      outline: none;
      border-color: #0d6efd;
      box-shadow: 0 0 0 3px rgba(13, 110, 253, 0.15);
    }

    .settings-group select:hover,
    .settings-group input:hover,
    .settings-group textarea:hover {
      border-color: var(--btn-hover-border);
    }

    .settings-actions {
      display: flex;
      justify-content: center;
      gap: 8px;
      margin-top: 20px;
      padding-top: 16px;
      border-top: 1px solid var(--border-color);
      position: sticky;
      bottom: 40px;
      background: var(--bg-color);
      padding-bottom: 10px;
    }

    .settings-actions button {
      padding: 8px 16px;
      border-radius: 6px;
      font-size: 14px;
      font-weight: 500;
      cursor: pointer;
      transition: all 0.2s ease;
      flex: 1;
      max-width: 150px;
      min-height: 50px;
    }

    .settings-actions .btn-secondary {
      background: var(--btn-bg);
      color: var(--btn-color);
      border: 1px solid var(--btn-border);
    }

    .settings-actions .btn-secondary:hover {
      background: var(--btn-hover-bg);
      border-color: var(--btn-hover-border);
    }

    .settings-actions .btn-primary {
      background: var(--btn-bg);
      color: var(--text-color);
      border: 1px solid var(--border-color);
    }

    .settings-actions .btn-primary:hover {
      background: var(--btn-hover-bg);
      border-color: var(--btn-hover-border);
    }

    @keyframes slideDown {
      from {
        opacity: 0;
        transform: translateY(-20px);
      }
      to {
        opacity: 1;
        transform: translateY(0);
      }
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
        <div class="label-with-button">
        <label for="editTitle_${favorite.timestamp}">Title</label>
          <button type="button" class="generate-btn generate-title-btn" title="Generate Title with AI">📝</button>
        </div>
        <input type="text" id="editTitle_${favorite.timestamp}" class="edit-title" placeholder="Enter title" value="${favorite.title || ''}">
      </div>
      <div class="form-group">
        <label for="editTags_${favorite.timestamp}">Tags</label>
        <input type="text" id="editTags_${favorite.timestamp}" class="edit-tags" placeholder="Add space-separated tags" value="${(favorite.tags || []).join(' ')}">
      </div>
      <div class="form-group">
        <div class="label-with-button">
        <label for="editDescription_${favorite.timestamp}">Description</label>
          <button type="button" class="generate-btn" title="Generate Summary with AI">📝</button>
        </div>
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
    const generateDescButton = form.querySelector('.generate-btn:not(.generate-title-btn)');
    const generateTitleButton = form.querySelector('.generate-title-btn');
    const titleInput = form.querySelector('.edit-title');
    const tagsInput = form.querySelector('.edit-tags');
    const descriptionInput = form.querySelector('.edit-description');

    // Добавляем обработчик для кнопки генерации названия
    generateTitleButton.addEventListener('click', async () => {
      try {
        // Показываем состояние загрузки
        generateTitleButton.disabled = true;
        generateTitleButton.style.opacity = '0.7';
        generateTitleButton.textContent = '⌛';

        // Загружаем содержимое чата
        const chatData = await loadChatContent(favorite.timestamp);
        
        // Формируем текст для генерации названия
        const chatText = chatData.map(message => {
          const role = message.type === 'question' ? 'User' : 'Assistant';
          return `${role}: ${message.content}`;
        }).join('\n\n');

        // Получаем настройки
        const settings = await new Promise(resolve => {
          chrome.storage.sync.get(['settings'], result => {
            resolve(result.settings || DEFAULT_SETTINGS);
          });
        });

        if (!settings.apiKeys[settings.provider]) {
          throw new Error('API key not found. Please add it in Settings.');
        }

        let response;
        let title;

        if (settings.provider === 'google') {
          // Используем Google AI API
          const apiVersion = settings.model === 'gemini-pro' ? 'v1' : 'v1beta';
          const modelId = settings.model === 'gemini-pro' ? 'gemini-pro' : settings.model;
          
          response = await fetch(`https://generativelanguage.googleapis.com/${apiVersion}/models/${modelId}:generateContent?key=${settings.apiKeys[settings.provider]}`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              contents: [{
                parts: [{
                  text: settings.titlePrompt.replace('{text}', chatText)
                }]
              }]
            })
          });

          if (!response.ok) {
            const error = await response.json();
            console.error('Google AI API error:', error);
            throw new Error(error.error?.message || 'Failed to generate title');
          }

          const data = await response.json();
          console.log('Google AI API response:', data);

          if (!data.candidates || !data.candidates[0] || !data.candidates[0].content) {
            console.error('Invalid Google AI response format:', data);
            throw new Error('Invalid response format from Google AI');
          }

          const content = data.candidates[0].content;
          if (!content.parts || !content.parts[0] || !content.parts[0].text) {
            console.error('Missing text in Google AI response:', content);
            throw new Error('No text generated from Google AI');
          }

          title = content.parts[0].text;
        } else {
          // Используем OpenRouter API
          response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${settings.apiKeys[settings.provider]}`,
            'HTTP-Referer': 'https://github.com/your-username/deepseek-favorites',
            'X-Title': 'DeepSeek Favorites Extension'
          },
          body: JSON.stringify({
            model: settings.model,
            messages: [
              {
                role: 'user',
                content: settings.titlePrompt.replace('{text}', chatText)
              }
            ]
          })
        });

        if (!response.ok) {
          const error = await response.json();
            console.error('OpenRouter API error:', error);
            throw new Error(error.message || `API error: ${response.status} ${response.statusText}`);
        }

        const data = await response.json();
          console.log('OpenRouter API response:', data);

          if (!data || !data.choices) {
            console.error('Invalid API response format:', data);
            throw new Error('Invalid API response format - missing choices array');
          }

          if (data.choices.length === 0) {
            console.error('Empty choices array in response:', data);
            throw new Error('No response generated from the model');
          }

          const firstChoice = data.choices[0];
          if (!firstChoice || !firstChoice.message) {
            console.error('Invalid choice format:', firstChoice);
            throw new Error('Invalid response format - missing message');
          }

          title = firstChoice.message.content;
          if (!title) {
            console.error('Empty content in response:', firstChoice);
            throw new Error('Empty response from the model');
          }
        }

        // Обновляем поле названия
        titleInput.value = title;

        // Копируем название в буфер обмена
        await navigator.clipboard.writeText(title);

        // Показываем уведомление об успехе
        showNotification('Title generated and copied to clipboard!');

      } catch (error) {
        console.error('Error generating title:', error);
        showNotification(error.message || 'Failed to generate title. Please try again.', true);
      } finally {
        // Возвращаем кнопку в исходное состояние
        generateTitleButton.disabled = false;
        generateTitleButton.style.opacity = '1';
        generateTitleButton.textContent = '📝';
      }
    });

    // Добавляем обработчик для кнопки генерации summary
    generateDescButton.addEventListener('click', async () => {
      try {
        // Показываем состояние загрузки
        generateDescButton.disabled = true;
        generateDescButton.style.opacity = '0.7';
        generateDescButton.textContent = '⌛ Generating...';

        // Загружаем содержимое чата
        const chatData = await loadChatContent(favorite.timestamp);
        
        // Формируем текст для генерации summary
        const chatText = chatData.map(message => {
          const role = message.type === 'question' ? 'User' : 'Assistant';
          return `${role}: ${message.content}`;
        }).join('\n\n');

        // Получаем настройки
        const settings = await new Promise(resolve => {
          chrome.storage.sync.get(['settings'], result => {
            resolve(result.settings || DEFAULT_SETTINGS);
          });
        });

        if (!settings.apiKeys[settings.provider]) {
          throw new Error('API key not found. Please add it in Settings.');
        }

        let response;
        let summary;

        if (settings.provider === 'google') {
          // Используем Google AI API
          const apiVersion = settings.model === 'gemini-pro' ? 'v1' : 'v1beta';
          const modelId = settings.model === 'gemini-pro' ? 'gemini-pro' : settings.model;
          
          response = await fetch(`https://generativelanguage.googleapis.com/${apiVersion}/models/${modelId}:generateContent?key=${settings.apiKeys[settings.provider]}`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              contents: [{
                parts: [{
                  text: settings.summaryPrompt.replace('{text}', chatText)
                }]
              }]
            })
          });

          if (!response.ok) {
            const error = await response.json();
            console.error('Google AI API error:', error);
            throw new Error(error.error?.message || 'Failed to generate summary');
          }

          const data = await response.json();
          console.log('Google AI API response:', data);

          if (!data.candidates || !data.candidates[0] || !data.candidates[0].content) {
            console.error('Invalid Google AI response format:', data);
            throw new Error('Invalid response format from Google AI');
          }

          const content = data.candidates[0].content;
          if (!content.parts || !content.parts[0] || !content.parts[0].text) {
            console.error('Missing text in Google AI response:', content);
            throw new Error('No text generated from Google AI');
          }

          summary = content.parts[0].text;
        } else {
          // Используем OpenRouter API
          response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${settings.apiKeys[settings.provider]}`,
            'HTTP-Referer': 'https://github.com/your-username/deepseek-favorites',
            'X-Title': 'DeepSeek Favorites Extension'
          },
          body: JSON.stringify({
            model: settings.model,
            messages: [
              {
                role: 'user',
                content: settings.summaryPrompt.replace('{text}', chatText)
              }
            ]
          })
        });

        if (!response.ok) {
          const error = await response.json();
            console.error('OpenRouter API error:', error);
            throw new Error(error.message || `API error: ${response.status} ${response.statusText}`);
        }

        const data = await response.json();
          console.log('OpenRouter API response:', data);

          if (!data || !data.choices) {
            console.error('Invalid API response format:', data);
            throw new Error('Invalid API response format - missing choices array');
          }

          if (data.choices.length === 0) {
            console.error('Empty choices array in response:', data);
            throw new Error('No response generated from the model');
          }

          const firstChoice = data.choices[0];
          if (!firstChoice || !firstChoice.message) {
            console.error('Invalid choice format:', firstChoice);
            throw new Error('Invalid response format - missing message');
          }

          summary = firstChoice.message.content;
          if (!summary) {
            console.error('Empty content in response:', firstChoice);
            throw new Error('Empty response from the model');
          }
        }

        // Обновляем поле описания
        descriptionInput.value = summary;

        // Копируем summary в буфер обмена
        await navigator.clipboard.writeText(summary);

        // Показываем уведомление об успехе
        showNotification('Summary generated and copied to clipboard!');

      } catch (error) {
        console.error('Error generating summary:', error);
        showNotification(error.message || 'Failed to generate summary. Please try again.', true);
      } finally {
        // Возвращаем кнопку в исходное состояние
        generateDescButton.disabled = false;
        generateDescButton.style.opacity = '1';
        generateDescButton.textContent = '📝 Generate';
      }
    });

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
      const newFavorites = currentFavorites.filter(f => f.timestamp !== favorite.timestamp);
          chrome.storage.sync.set({ favorites: newFavorites }, () => {
            currentFavorites = newFavorites;
            filterFavorites(searchInput.value);
          });
    }
  });

  // Функция для отображения списка избранного
  function renderFavorites(favorites) {
    if (!favorites || favorites.length === 0) {
      showNoFavorites();
      return;
    }
    
    // Очищаем список перед обновлением
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

    // Функция для проверки и очистки описания
    function sanitizeDescription(desc) {
      if (!desc) return '';
      // Разделяем на строки и удаляем пустые
      const descriptions = desc.split('\n').map(d => d.trim()).filter(Boolean);
      // Возвращаем только уникальные описания
      return [...new Set(descriptions)].join('\n');
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
      
      // Очищаем и обрезаем описание только для title атрибута
      const description = sanitizeDescription(favorite.description);
      const truncatedDescription = description ? truncateText(description, 150) : '';
      const tooltipText = description ? renderHTML(description) : ''; // Получаем чистый текст для тултипа
      
      chatElement.innerHTML = `
        <div class="chat-item ${favorite.pinned ? 'pinned' : ''}">
          <div class="chat-header">
            <a href="${favorite.url}" target="_blank" class="chat-title">
              ${favorite.pinned ? '📌 ' : ''}${escapeHtml(favorite.title || 'Untitled')}
            </a>
            <div class="button-group">
              <button type="button" class="pin-btn" title="${favorite.pinned ? 'Unpin' : 'Pin'}">${favorite.pinned ? '📌' : '📍'}</button>
              <button type="button" class="edit-btn" title="Edit">✎</button>
              <button type="button" class="delete-btn" title="Delete">×</button>
            </div>
          </div>
          <div class="chat-time">${chatTime}</div>
          ${description ? `<div class="description" title="${escapeHtml(tooltipText)}">${truncatedDescription}</div>` : ''}
          ${favorite.tags && favorite.tags.length > 0 ? 
            `<div class="prompt-tags">${favorite.tags.map(tag => `<span class="tag">#${escapeHtml(tag)}</span>`).join(' ')}</div>` 
            : ''}
          <button type="button" class="chat-btn" title="View Chat History">💬 Chat</button>
        </div>
      `;

      // Добавляем обработчики событий для кнопок
      const chatBtn = chatElement.querySelector('.chat-btn');
      const pinBtn = chatElement.querySelector('.pin-btn');
      const editBtn = chatElement.querySelector('.edit-btn');
      const deleteBtn = chatElement.querySelector('.delete-btn');

      // Обработчик для кнопки Chat
      chatBtn.addEventListener('click', () => {
        console.log('Opening chat window for:', favorite);
        chrome.windows.create({
          url: `chat-viewer.html?id=${favorite.timestamp}`,
          type: 'popup',
          width: 800,
          height: 600
        });
      });

      // Обработчик для кнопки Pin
      pinBtn.addEventListener('click', () => {
        const newPinned = !favorite.pinned;
        const newFavorites = currentFavorites.map(f => {
          if (f.timestamp === favorite.timestamp) {
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
      });

      // Обработчик для кнопки Edit
      editBtn.addEventListener('click', () => {
        startEdit(favorite);
      });

      // Обработчик для кнопки Delete
      deleteBtn.addEventListener('click', () => {
          const newFavorites = currentFavorites.filter(f => f.timestamp !== favorite.timestamp);
          chrome.storage.sync.set({ favorites: newFavorites }, () => {
            currentFavorites = newFavorites;
            filterFavorites(searchInput.value);
          });
      });

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
  async function exportToJson(favorites, prompts, settings) {
    // Получаем содержимое чатов из local storage
    const chatContents = {};
    for (const favorite of favorites) {
      try {
        const meta = await new Promise((resolve) => {
          chrome.storage.local.get([`${favorite.timestamp}_meta`], (result) => {
            resolve(result[`${favorite.timestamp}_meta`]);
          });
        });

        if (meta) {
          const chunkKeys = Array.from({ length: meta.chunks }, (_, i) => `${favorite.timestamp}_chunk_${i}`);
          const chunks = await new Promise((resolve) => {
            chrome.storage.local.get(chunkKeys, (result) => {
              resolve(Object.values(result));
            });
          });
          
          chatContents[favorite.timestamp] = {
            meta,
            content: chunks.join('')
          };
        }
      } catch (error) {
        console.error(`Error exporting chat content for ${favorite.timestamp}:`, error);
      }
    }

    const exportData = {
      version: "1.0",
      exportDate: new Date().toISOString(),
      theme: document.body.getAttribute('data-theme') || 'light',
      settings: settings || DEFAULT_SETTINGS,
      favorites: favorites.map(favorite => ({
        title: favorite.title || 'Untitled',
        url: favorite.url,
        timestamp: favorite.timestamp,
        description: favorite.description || '',
        pinned: favorite.pinned || false,
        pinnedOrder: favorite.pinnedOrder,
        tags: favorite.tags || [],
        chatContent: chatContents[favorite.timestamp] || null
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

  // Обработчик экспорта
  exportBtn.addEventListener('click', () => {
    chrome.storage.sync.get(['favorites', 'prompts', 'settings'], (result) => {
      const favorites = result.favorites || [];
      const prompts = result.prompts || [];
      const settings = result.settings || DEFAULT_SETTINGS;
      exportToJson(favorites, prompts, settings);
    });
  });

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
      let chatContents = [];
      if (importData.favorites && Array.isArray(importData.favorites)) {
        validatedFavorites = importData.favorites.map(favorite => {
          if (!favorite.url) {
            throw new Error('Invalid favorite: missing URL');
          }
          
          // Сохраняем содержимое чата для последующего импорта
          if (favorite.chatContent) {
            chatContents.push({
              timestamp: favorite.timestamp,
              content: favorite.chatContent
            });
          }
          
          // Удаляем chatContent из объекта избранного
          const { chatContent, ...favoriteData } = favorite;
          return {
            title: favoriteData.title || 'Untitled',
            url: favoriteData.url,
            timestamp: favoriteData.timestamp || new Date().toISOString(),
            description: favoriteData.description || '',
            pinned: Boolean(favoriteData.pinned),
            pinnedOrder: favoriteData.pinnedOrder,
            tags: favoriteData.tags || []
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

      // Проверяем и нормализуем настройки
      const validatedSettings = importData.settings ? {
        provider: importData.settings.provider || DEFAULT_SETTINGS.provider,
        apiKeys: {
          ...DEFAULT_SETTINGS.apiKeys,
          ...importData.settings.apiKeys
        },
        model: importData.settings.model || DEFAULT_SETTINGS.model,
        summaryPrompt: importData.settings.summaryPrompt || DEFAULT_SETTINGS.summaryPrompt
      } : DEFAULT_SETTINGS;
      
      return {
        theme: importData.theme || 'light',
        settings: validatedSettings,
        favorites: validatedFavorites,
        prompts: validatedPrompts,
        chatContents: chatContents
      };
    } catch (error) {
      console.error('Error parsing import file:', error);
      alert('Ошибка при импорте файла. Убедитесь, что файл имеет правильный формат JSON.');
      return { 
        theme: 'light', 
        settings: DEFAULT_SETTINGS, 
        favorites: [], 
        prompts: [],
        chatContents: []
      };
    }
  }

  // Обработчик импорта
  importFile.addEventListener('change', (event) => {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const content = e.target.result;
        const imported = importFromJson(content);
        
        if (imported.favorites.length === 0 && imported.prompts.length === 0) return;

        // Получаем текущие данные
        chrome.storage.sync.get(['favorites', 'prompts'], async (result) => {
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

          // Импортируем содержимое чатов в local storage
          for (const chatContent of imported.chatContents) {
            if (chatContent.content && chatContent.content.meta && chatContent.content.content) {
              try {
                // Сохраняем метаданные
                await new Promise((resolve, reject) => {
                  chrome.storage.local.set({
                    [`${chatContent.timestamp}_meta`]: chatContent.content.meta
                  }, () => {
                    if (chrome.runtime.lastError) reject(chrome.runtime.lastError);
                    else resolve();
                  });
                });

                // Разбиваем содержимое на чанки и сохраняем
                const content = chatContent.content.content;
                const chunkSize = 8000; // Размер чанка
                const chunks = [];
                
                for (let i = 0; i < content.length; i += chunkSize) {
                  chunks.push(content.slice(i, i + chunkSize));
                }

                await Promise.all(chunks.map((chunk, index) => {
                  return new Promise((resolve, reject) => {
                    chrome.storage.local.set({
                      [`${chatContent.timestamp}_chunk_${index}`]: chunk
                    }, () => {
                      if (chrome.runtime.lastError) reject(chrome.runtime.lastError);
                      else resolve();
                    });
                  });
                }));
              } catch (error) {
                console.error(`Error importing chat content for ${chatContent.timestamp}:`, error);
              }
            }
          }

          // Сохраняем обновленные данные, тему и настройки
          chrome.storage.sync.set({ 
            favorites: updatedFavorites,
            prompts: updatedPrompts,
            theme: imported.theme,
            settings: imported.settings
          }, () => {
            // Очищаем поля поиска
            searchInput.value = '';
            promptSearchInput.value = '';
            
            // Обновляем текущие данные в памяти
            currentFavorites = updatedFavorites;
            currentPrompts = updatedPrompts;
            
            // Обновляем тему
            setTheme(imported.theme);

            // Обновляем настройки в форме настроек
            loadSettings();
            
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
            if (imported.chatContents.length > 0) {
              message.push(`${imported.chatContents.length} chat histories`);
            }
            message.push('settings');
            
            if (message.length > 0) {
              alert(`Successfully imported: ${message.join(', ')}`);
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
          height: 580
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
      height: 580
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

    // Функция для очистки HTML тегов
    function stripHtml(html) {
      const tmp = document.createElement('div');
      tmp.innerHTML = html;
      return tmp.textContent || tmp.innerText || '';
    }

    // Функция для обрезки текста
    function truncateText(text, maxLength) {
      return text.length > maxLength ? text.substring(0, maxLength) + '...' : text;
    }

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
      
      // Обрезаем текст промпта до 120 символов для отображения
      const truncatedText = truncateText(prompt.text, 120);
      
      // Подготавливаем текст для тултипа: очищаем от HTML и ограничиваем 300 символами
      const tooltipText = truncateText(stripHtml(prompt.text), 300);
      
      promptElement.innerHTML = `
        <div class="prompt-title">${prompt.pinned ? '📌 ' : ''}${prompt.title}</div>
        <div class="prompt-text" title="${tooltipText}">${truncatedText}</div>
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

  // Функция для создания элемента избранного
  function createFavoriteElement(favorite) {
    const favoriteElement = document.createElement('div');
    favoriteElement.className = 'favorite-chat';
    favoriteElement.setAttribute('data-timestamp', favorite.timestamp);
    
    const chatTime = new Date(favorite.timestamp).toLocaleString('ru-RU', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
    
    // Обрезаем описание до 120 символов
    const truncatedDescription = favorite.description ? truncateText(favorite.description, 120) : '';
    
    favoriteElement.innerHTML = `
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
        <button type="button" class="chat-btn" title="View Chat History">💬 Chat</button>
      </div>
    `;

    // Добавляем обработчики событий
    const chatBtn = favoriteElement.querySelector('.chat-btn');
    chatBtn.addEventListener('click', () => {
      console.log('Opening chat window for:', favorite);
      chrome.windows.create({
        url: `chat-viewer.html?id=${favorite.timestamp}`,
        type: 'popup',
        width: 800,
        height: 600
      });
    });

    // ... остальные обработчики событий ...

    return favoriteElement;
  }

  // Функция для открытия модального окна с чатом
  function openChatModal(favorite) {
    const modal = document.getElementById('chatModal');
    const modalTitle = modal.querySelector('.modal-title');
    const modalContent = modal.querySelector('#chatContent');
    const closeBtn = modal.querySelector('.modal-close');
    const copyBtn = modal.querySelector('.copy-btn');

    // Устанавливаем заголовок
    modalTitle.textContent = `Chat History: ${favorite.title}`;

    // Загружаем содержимое чата
    chrome.storage.local.get([`${favorite.timestamp}_meta`], async (metaResult) => {
      if (metaResult[`${favorite.timestamp}_meta`]) {
        const meta = metaResult[`${favorite.timestamp}_meta`];
        const chunks = [];
        
        // Загружаем все чанки
        for (let i = 0; i < meta.chunks; i++) {
          const key = `${favorite.timestamp}_chunk_${i}`;
          const chunk = await new Promise(resolve => {
            chrome.storage.local.get([key], result => resolve(result[key]));
          });
          chunks.push(chunk);
        }
        
        // Собираем и парсим содержимое
        const chatContent = JSON.parse(chunks.join(''));
        
        // Отображаем содержимое чата
        const chatHtml = chatContent.map(message => {
          if (message.type === 'question') {
            return `
              <div class="chat-message user-message">
                <div class="message-header">User:</div>
                <div class="message-content">${escapeHtml(message.content)}</div>
              </div>
            `;
          } else {
            return `
              <div class="chat-message assistant-message">
                <div class="message-header">Assistant:</div>
                <div class="message-content">${escapeHtml(message.content)}</div>
              </div>
            `;
          }
        }).join('');

        modalContent.innerHTML = `
          <div class="chat-container">
            ${chatHtml}
          </div>
        `;

        // Показываем кнопку копирования
        copyBtn.style.display = 'block';

        // Добавляем обработчик копирования
        const handleCopy = () => {
          const textToCopy = chatContent.map(message => {
            const role = message.type === 'question' ? 'User' : 'Assistant';
            return `${role}:\n${message.content}\n`;
          }).join('\n');

          navigator.clipboard.writeText(textToCopy).then(() => {
            const originalText = copyBtn.innerHTML;
            copyBtn.innerHTML = '✅ Copied!';
            setTimeout(() => {
              copyBtn.innerHTML = originalText;
            }, 2000);
          }).catch(err => {
            console.error('Failed to copy text: ', err);
            copyBtn.innerHTML = '❌ Error';
            setTimeout(() => {
              copyBtn.innerHTML = originalText;
            }, 2000);
          });
        };

        copyBtn.addEventListener('click', handleCopy);
      } else {
        modalContent.innerHTML = `
          <p>No chat history available for "${escapeHtml(favorite.title)}"</p>
          <p>URL: ${escapeHtml(favorite.url)}</p>
        `;
        copyBtn.style.display = 'none';
      }

      // Показываем модальное окно
      modal.classList.add('active');

      // Обработчик закрытия
      const closeModal = () => {
        modal.classList.remove('active');
        closeBtn.removeEventListener('click', closeModal);
        modal.removeEventListener('click', handleOutsideClick);
        copyBtn.removeEventListener('click', handleCopy);
      };

      // Закрытие по клику на крестик
      closeBtn.addEventListener('click', closeModal);

      // Закрытие по клику вне модального окна
      const handleOutsideClick = (event) => {
        if (event.target === modal) {
          closeModal();
        }
      };
      modal.addEventListener('click', handleOutsideClick);
    });
  }

  // Функция для экранирования HTML
  function escapeHtml(unsafe) {
    return unsafe
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  // Добавляем слушатель сообщений от chat-viewer
  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.action === 'updateDescription') {
      // Обновляем описание в избранном
      chrome.storage.sync.get(['favorites'], (result) => {
        const favorites = result.favorites || [];
        const updatedFavorites = favorites.map(f => {
          if (f.timestamp === message.timestamp) {
            return { ...f, description: message.description };
          }
          return f;
        });

        chrome.storage.sync.set({ favorites: updatedFavorites }, () => {
          // Обновляем текущие избранные
          currentFavorites = updatedFavorites;
          
          // Обновляем поле описания в форме редактирования, если она открыта
          const editForm = document.querySelector('.edit-form');
          if (editForm) {
            const descriptionTextarea = editForm.querySelector('.edit-description');
            if (descriptionTextarea) {
              descriptionTextarea.value = message.description;
            }
          }

          // Обновляем отображение списка избранного
          filterFavorites(searchInput.value);
        });
      });
    }
  });

  // Обновляем слушатель сообщений от других окон
  window.addEventListener('message', (event) => {
    if (event.data.action === 'updateDescription') {
      // Обновляем описание в избранном
      chrome.storage.sync.get(['favorites'], (result) => {
        const favorites = result.favorites || [];
        const updatedFavorites = favorites.map(f => {
          if (f.timestamp === event.data.timestamp) {
            return { ...f, description: event.data.description };
          }
          return f;
        });

        chrome.storage.sync.set({ favorites: updatedFavorites }, () => {
          // Обновляем текущие избранные
          currentFavorites = updatedFavorites;
          
          // Обновляем поле описания в форме редактирования, если она открыта
          const editForm = document.querySelector('.edit-form');
          if (editForm) {
            const descriptionTextarea = editForm.querySelector('.edit-description');
            if (descriptionTextarea) {
              descriptionTextarea.value = event.data.description;
            }
          }

          // Обновляем отображение списка избранного
          filterFavorites(searchInput.value);
        });
      });
    }
  });

  // Функция для безопасного отображения HTML
  function renderHTML(html) {
    const div = document.createElement('div');
    div.innerHTML = html;
    return div.textContent || div.innerText || '';
  }

  // Добавляем функцию проверки соединения
  let settingsBeforeCheck = null;

  async function checkConnection(settings) {
    const checkConnectionBtn = document.getElementById('checkConnectionBtn');
    
    try {
      checkConnectionBtn.classList.add('checking');
      checkConnectionBtn.textContent = '⌛';
      
      const currentProvider = settings.provider;
      const apiKey = settings.apiKeys[currentProvider];

      if (!apiKey) {
        throw new Error('API key not found');
      }

      // Временно применяем новые настройки для проверки
      await chrome.storage.sync.set({ settings });

      let response;
      let result;
      
      if (currentProvider === 'google') {
        const apiVersion = settings.model === 'gemini-pro' ? 'v1' : 'v1beta';
        const modelId = settings.model === 'gemini-pro' ? 'gemini-pro' : settings.model;
        
        response = await fetch(`https://generativelanguage.googleapis.com/${apiVersion}/models/${modelId}:generateContent?key=${apiKey}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            contents: [{
              parts: [{
                text: 'Generate a one-word response: "test"'
              }]
            }]
          })
        });

        if (!response.ok) {
          throw new Error(`API error: ${response.status}`);
        }

        const data = await response.json();
        if (!data.candidates || !data.candidates[0] || !data.candidates[0].content || !data.candidates[0].content.parts || !data.candidates[0].content.parts[0]) {
          throw new Error('Invalid API response format from Google AI');
        }
        result = data.candidates[0].content.parts[0].text;

      } else {
        response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`,
            'HTTP-Referer': 'https://github.com/your-username/deepseek-favorites',
            'X-Title': 'DeepSeek Favorites Extension'
          },
          body: JSON.stringify({
            model: settings.model,
            messages: [
              {
                role: 'user',
                content: 'Generate a one-word response: "test"'
              }
            ]
          })
        });

        if (!response.ok) {
          throw new Error(`API error: ${response.status}`);
        }

        const data = await response.json();
        if (!data.choices || !Array.isArray(data.choices) || data.choices.length === 0 || !data.choices[0].message || !data.choices[0].message.content) {
          throw new Error('Invalid API response format from OpenRouter');
        }
        result = data.choices[0].message.content;
      }

      // Проверяем, что получили какой-то текст в ответе
      if (!result || typeof result !== 'string' || result.trim().length === 0) {
        throw new Error('Empty or invalid response from the model');
      }

      // Если дошли до сюда, значит соединение успешно
      checkConnectionBtn.classList.remove('checking', 'error');
      checkConnectionBtn.classList.add('success');
      checkConnectionBtn.textContent = '✓';
      showNotification('Connection successful! Model responded correctly.');

      // Через 3 секунды возвращаем кнопку в исходное состояние
      setTimeout(() => {
        checkConnectionBtn.classList.remove('success');
        checkConnectionBtn.textContent = '🔄';
      }, 3000);

    } catch (error) {
      console.error('Connection check failed:', error);
      checkConnectionBtn.classList.remove('checking', 'success');
      checkConnectionBtn.classList.add('error');
      checkConnectionBtn.textContent = '✕';
      showNotification('Connection failed: ' + error.message, true);

      // Через 3 секунды возвращаем кнопку в исходное состояние
      setTimeout(() => {
        checkConnectionBtn.classList.remove('error');
        checkConnectionBtn.textContent = '🔄';
      }, 3000);
    }
  }

  // Добавляем обработчик для кнопки проверки соединения
  document.getElementById('checkConnectionBtn').addEventListener('click', async () => {
    const currentProvider = providerSelect.value;
    
    // Получаем текущие настройки для сохранения всех API ключей
    const currentSettings = await new Promise(resolve => {
      chrome.storage.sync.get(['settings'], result => {
        resolve(result.settings || DEFAULT_SETTINGS);
      });
    });

    const newSettings = {
      provider: currentProvider,
      apiKeys: {
        ...currentSettings.apiKeys,
        [currentProvider]: apiKeyInput.value.trim()
      },
      model: modelSelect.value,
      titlePrompt: titlePromptInput.value.trim() || DEFAULT_SETTINGS.titlePrompt,
      summaryPrompt: summaryPromptInput.value.trim() || DEFAULT_SETTINGS.summaryPrompt
    };
    
    checkConnection(newSettings);
  });

  // Загрузка настроек
  function loadSettings() {
    chrome.storage.sync.get(['settings'], (result) => {
      const settings = result.settings || DEFAULT_SETTINGS;
      
      // Обновляем провайдера
      providerSelect.value = settings.provider;
      
      // Обновляем список моделей для выбранного провайдера
      updateModelsList(settings.provider);
      
      // Устанавливаем API ключ для текущего провайдера
      apiKeyInput.value = settings.apiKeys[settings.provider] || '';
      
      // Устанавливаем значение модели
      modelSelect.value = settings.model || PROVIDER_MODELS[settings.provider][0].value;
      
      // Устанавливаем шаблоны промптов
      titlePromptInput.value = settings.titlePrompt || DEFAULT_SETTINGS.titlePrompt;
      summaryPromptInput.value = settings.summaryPrompt || DEFAULT_SETTINGS.summaryPrompt;

      // Сохраняем последние настройки
      lastSavedSettings = settings;
    });
  }

  // Функция сохранения настроек
  function saveSettings() {
    chrome.storage.sync.get(['settings'], (result) => {
      const currentSettings = result.settings || DEFAULT_SETTINGS;
      const provider = document.getElementById('provider').value;
      const apiKey = document.getElementById('apiKey').value.trim();
      const model = document.getElementById('model').value;
      const summaryPrompt = document.getElementById('summaryPrompt').value.trim();
      const titlePrompt = document.getElementById('titlePrompt').value.trim();

      // Сохраняем новые настройки, сохраняя существующие API ключи
      const newSettings = {
        provider: provider,
        apiKeys: {
          openrouter: provider === 'openrouter' ? apiKey : currentSettings.apiKeys.openrouter,
          google: provider === 'google' ? apiKey : currentSettings.apiKeys.google
        },
        model: model,
        titlePrompt: titlePrompt || currentSettings.titlePrompt,
        summaryPrompt: summaryPrompt || currentSettings.summaryPrompt
      };

      chrome.storage.sync.set({ settings: newSettings }, () => {
        console.log('Settings saved:', newSettings);
        showNotification('Settings saved automatically');
        lastSavedSettings = newSettings;
      });
    });
  }

  // Добавляем автосохранение для всех полей в настройках
  document.querySelectorAll('#settingsModal input, #settingsModal select, #settingsModal textarea').forEach(element => {
    ['input', 'change'].forEach(eventType => {
      element.addEventListener(eventType, saveSettings);
    });
  });

  // Добавляем слушатель сообщений от других окон
  window.addEventListener('message', (event) => {
    if (event.data.action === 'updateDescription') {
      const editForm = document.querySelector('.edit-form');
      if (editForm) {
        const descriptionTextarea = editForm.querySelector('.edit-description');
        if (descriptionTextarea) {
          descriptionTextarea.value = event.data.description;
        }
      }
    }
  });

  // Обработчик изменения провайдера
  document.getElementById('provider').addEventListener('change', (e) => {
    const newProvider = e.target.value;
    
    // Загружаем текущие настройки
    chrome.storage.sync.get(['settings'], (result) => {
      const settings = result.settings || DEFAULT_SETTINGS;
      
      // Обновляем поле API ключа
      document.getElementById('apiKey').value = settings.apiKeys[newProvider] || '';
      
      // Обновляем список моделей
      updateModelsList(newProvider);
      
      // Сохраняем изменение провайдера
      saveSettings();
    });
  });
}); 