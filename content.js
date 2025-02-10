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

// Функция для получения чистого текста сообщения
function getCleanMessageText(container) {
  // Создаем временный div для очистки текста
  const tempDiv = document.createElement('div');
  // Копируем содержимое, исключая кнопки и другие интерактивные элементы
  const messageContent = container.querySelector('[class*="markdown-"]');
  if (!messageContent) return '';
  
  // Клонируем содержимое, чтобы не затронуть оригинал
  const clone = messageContent.cloneNode(true);
  
  // Удаляем все кнопки и другие ненужные элементы
  const elementsToRemove = clone.querySelectorAll('button, [class*="ds-icon"], [role="button"]');
  elementsToRemove.forEach(el => el.remove());
  
  // Получаем очищенный текст
  tempDiv.innerHTML = clone.innerHTML;
  const cleanText = tempDiv.textContent.trim()
    .replace(/\s+/g, ' ') // Заменяем множественные пробелы на один
    .replace(/^\d+\.\s*/, ''); // Удаляем нумерацию в начале, если есть
  
  return cleanText;
}

// Функция для показа уведомления
function showNotification(message, isWarning = false) {
  // Проверяем, нет ли уже уведомления
  let notification = document.querySelector('.favorites-notification');
  if (notification) {
    notification.remove();
  }
  
  // Создаем уведомление
  notification = document.createElement('div');
  notification.className = 'favorites-notification';
  // Разделяем заголовок и текст сообщения
  const [title, text] = message.split('\n');
  notification.innerHTML = `
    <div style="font-weight: bold; margin-bottom: 4px;">${title}</div>
    ${text ? `<div style="font-size: 12px; opacity: 0.9; word-wrap: break-word;">${text}</div>` : ''}
  `;
  notification.style.cssText = `
    position: fixed;
    bottom: 20px;
    right: 20px;
    background-color: ${isWarning ? '#FFA500' : '#4CAF50'};
    color: ${isWarning ? '#000000' : '#FFFFFF'};
    padding: 12px 24px;
    border-radius: 4px;
    font-size: 14px;
    z-index: 10000;
    opacity: 0;
    transform: translateY(20px);
    transition: all 0.3s ease;
    box-shadow: 0 2px 5px rgba(0,0,0,0.2);
    max-width: 300px;
    word-wrap: break-word;
  `;
  
  // Добавляем уведомление на страницу
  document.body.appendChild(notification);
  
  // Анимируем появление
  setTimeout(() => {
    notification.style.opacity = '1';
    notification.style.transform = 'translateY(0)';
  }, 100);
  
  // Удаляем через 5 секунд для ошибок и 3 секунды для обычных уведомлений
  setTimeout(() => {
    notification.style.opacity = '0';
    notification.style.transform = 'translateY(20px)';
    setTimeout(() => notification.remove(), 300);
  }, isWarning ? 5000 : 3000);
}

// Функция для получения HTML содержимого сообщения
function getMessageContent(container) {
  if (!container) return { text: '', html: '' };
  
  // Создаем временный div для очистки текста
  const tempDiv = document.createElement('div');
  tempDiv.innerHTML = container.innerHTML;
  
  // Удаляем все кнопки и другие ненужные элементы
  const elementsToRemove = tempDiv.querySelectorAll('button, [class*="ds-icon"], [role="button"]');
  elementsToRemove.forEach(el => el.remove());
  
  // Получаем очищенный текст и HTML
  const text = tempDiv.textContent.trim()
    .replace(/\s+/g, ' ') // Заменяем множественные пробелы на один
    .replace(/^\d+\.\s*/, ''); // Удаляем нумерацию в начале, если есть
  
  // Получаем HTML, сохраняя форматирование кода и другие элементы
  const html = container.innerHTML;
  
  return { text, html };
}

// Функция для получения содержимого чата
async function getChatContent() {
  const chatContent = [];
  
  // Находим все сообщения в чате
  const messages = document.querySelectorAll('[class*="chat-message"]');
  
  messages.forEach(message => {
    // Определяем тип сообщения (вопрос или ответ)
    const isQuestion = message.classList.contains('user') || 
                      message.querySelector('[class*="user"]') !== null;
    
    // Находим контейнер с содержимым сообщения
    const contentContainer = message.querySelector('[class*="markdown"]') || 
                           message.querySelector('[class*="content"]');
    
    if (contentContainer) {
      const content = getMessageContent(contentContainer);
      
      chatContent.push({
        type: isQuestion ? 'question' : 'answer',
        content: content.text,
        html: content.html
      });
    }
  });

  // Если не нашли сообщения через основной селектор, пробуем альтернативные
  if (chatContent.length === 0) {
    const alternativeMessages = document.querySelectorAll('.fbb737a4, .ds-markdown.ds-markdown--block');
    
    alternativeMessages.forEach(message => {
      const isQuestion = message.classList.contains('fbb737a4');
      const content = getMessageContent(message);
      
      chatContent.push({
        type: isQuestion ? 'question' : 'answer',
        content: content.text,
        html: content.html
      });
    });
  }

  return chatContent;
}

// Функция для разбиения данных на чанки
function splitIntoChunks(data, maxChunkSize = 8000) {
  const serialized = JSON.stringify(data);
  const chunks = [];
  let index = 0;
  
  while (index < serialized.length) {
    chunks.push(serialized.slice(index, index + maxChunkSize));
    index += maxChunkSize;
  }
  
  return chunks;
}

// Функция для сохранения чанков в storage
async function saveChunks(key, chunks) {
  const savePromises = chunks.map((chunk, index) => {
    return new Promise((resolve, reject) => {
      const chunkKey = `${key}_chunk_${index}`;
      chrome.storage.local.set({ [chunkKey]: chunk }, () => {
        if (chrome.runtime.lastError) {
          reject(chrome.runtime.lastError);
        } else {
          resolve();
        }
      });
    });
  });

  await Promise.all(savePromises);
  
  // Сохраняем метаданные о чанках
  return new Promise((resolve, reject) => {
    chrome.storage.local.set({
      [`${key}_meta`]: {
        chunks: chunks.length,
        timestamp: Date.now()
      }
    }, () => {
      if (chrome.runtime.lastError) {
        reject(chrome.runtime.lastError);
      } else {
        resolve();
      }
    });
  });
}

// Функция для добавления в избранное
async function addToFavorites(chatTitle, messageText = '') {
  try {
    // Получаем содержимое чата
    const chatContent = await getChatContent();
    
    const favorite = {
      title: chatTitle.slice(0, 200),
      url: window.location.href,
      timestamp: new Date().toISOString(),
      description: messageText.slice(0, 500) || '',
      hasContent: true
    };
    
    // Сохраняем и ждем результата
    await new Promise((resolve, reject) => {
      chrome.storage.sync.get(['favorites'], async (result) => {
        try {
          const favorites = result.favorites || [];
          
          // Проверяем, нет ли уже такого чата
          if (!favorites.some(f => f.url === favorite.url)) {
            favorites.push(favorite);
            
            // Сохраняем метаданные в sync storage
            chrome.storage.sync.set({ favorites }, async () => {
              if (chrome.runtime.lastError) {
                reject(new Error('Storage error: ' + chrome.runtime.lastError.message));
                return;
              }
              
              try {
                // Сохраняем содержимое чата в local storage
                const chunks = splitIntoChunks(chatContent);
                await saveChunks(favorite.timestamp, chunks);
                
                console.log('Favorite saved successfully:', favorite);
                showNotification(`Added to Favorites! ⭐\n"${chatTitle}"`, false);
                resolve();
              } catch (error) {
                console.error('Error saving chat content:', error);
                reject(error);
              }
            });
          } else {
            console.log('Chat already in favorites');
            showNotification(`Already in Favorites! 🔔\n"${chatTitle}"`, true);
            resolve();
          }
        } catch (error) {
          console.error('Error in storage operation:', error);
          reject(error);
        }
      });
    });
  } catch (error) {
    console.error('Error adding to favorites:', error);
    showNotification('Error saving to favorites! ❌', true);
  }
}

// Функция для получения заголовка чата
function getChatTitle() {
  // Пробуем разные селекторы для поиска заголовка
  const selectors = [
    'div[class*="d8ed659a"]',
    'div[class*="chat-title"]',
    'div[class*="title"]',
    'h1',
    'div.title'
  ];

  for (const selector of selectors) {
    const element = document.querySelector(selector);
    if (element) {
      const title = element.textContent.trim();
      if (title) return title;
    }
  }

  // Если не нашли заголовок, используем URL
  return 'Chat ' + new Date().toLocaleString('en-US');
}

// Добавляем слушатель сообщений от background script
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log('Content script received message:', message);
  
  if (message.action === "addToFavorites") {
    console.log('Adding to favorites...');
    const chatTitle = getChatTitle();
    console.log('Chat title:', chatTitle);
    
    addToFavorites(chatTitle, message.selectionText)
      .then(() => {
        console.log('Successfully added to favorites');
        sendResponse({ success: true });
      })
      .catch((error) => {
        console.error('Error adding to favorites:', error);
        sendResponse({ success: false, error: error.message });
      });
    
    return true; // Важно для асинхронного ответа
  }
});

// Сообщаем background script, что content script загружен
console.log('Content script loaded, sending ready message...');
chrome.runtime.sendMessage({ action: "contentScriptReady" }, (response) => {
  console.log('Ready message sent, response:', response);
}); 