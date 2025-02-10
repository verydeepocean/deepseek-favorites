// Функция для загрузки чанков и восстановления данных
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

document.addEventListener('DOMContentLoaded', async () => {
  const chatContent = document.getElementById('chatContent');
  const copyBtn = document.querySelector('.copy-btn');
  const themeToggle = document.querySelector('.theme-toggle');
  const title = document.querySelector('.title');
  
  // Получаем параметры URL
  const urlParams = new URLSearchParams(window.location.search);
  const timestamp = urlParams.get('id');
  
  // Функция для установки темы
  function setTheme(theme) {
    document.body.setAttribute('data-theme', theme);
    chrome.storage.sync.set({ theme });
  }

  // Загружаем сохраненную тему
  chrome.storage.sync.get(['theme'], (result) => {
    const savedTheme = result.theme || 'light';
    setTheme(savedTheme);
  });

  // Переключение темы
  themeToggle.addEventListener('click', () => {
    const currentTheme = document.body.getAttribute('data-theme');
    setTheme(currentTheme === 'light' ? 'dark' : 'light');
  });

  // Функция для экранирования HTML
  function escapeHtml(unsafe) {
    return unsafe
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  // Загружаем данные чата
  try {
    const metaResult = await new Promise(resolve => {
      chrome.storage.local.get([`${timestamp}_meta`], resolve);
    });

    if (metaResult[`${timestamp}_meta`]) {
      const meta = metaResult[`${timestamp}_meta`];
      const chunks = [];
      
      // Загружаем все чанки
      for (let i = 0; i < meta.chunks; i++) {
        const key = `${timestamp}_chunk_${i}`;
        const chunk = await new Promise(resolve => {
          chrome.storage.local.get([key], result => resolve(result[key]));
        });
        chunks.push(chunk);
      }
      
      // Собираем и парсим содержимое
      const chatData = JSON.parse(chunks.join(''));
      
      // Получаем заголовок чата
      chrome.storage.sync.get(['favorites'], (result) => {
        const favorite = result.favorites.find(f => f.timestamp === timestamp);
        if (favorite) {
          title.textContent = `Chat History: ${favorite.title}`;
          document.title = favorite.title;
        }
      });
      
      // Отображаем содержимое чата с сохранением HTML
      const chatHtml = chatData.map(message => {
        return `
          <div class="chat-message ${message.type === 'question' ? 'user-message' : 'assistant-message'}">
            <div class="message-header">${message.type === 'question' ? '<strong>User:</strong>' : '<strong>Assistant:</strong>'}</div>
            <div class="message-content">${message.html || message.content}</div>
          </div>
        `;
      }).join('');

      chatContent.innerHTML = chatHtml;

      // Обработчик копирования
      copyBtn.addEventListener('click', () => {
        const textToCopy = chatData.map(message => {
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
      });
    } else {
      chatContent.innerHTML = '<div class="chat-container"><p>No chat history available</p></div>';
      copyBtn.style.display = 'none';
    }
  } catch (error) {
    console.error('Error loading chat:', error);
    chatContent.innerHTML = '<div class="chat-container"><p>Error loading chat history</p></div>';
    copyBtn.style.display = 'none';
  }
}); 