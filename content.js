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
    <div style="font-size: 12px; opacity: 0.9;">${text || ''}</div>
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
  `;
  
  // Добавляем уведомление на страницу
  document.body.appendChild(notification);
  
  // Анимируем появление
  setTimeout(() => {
    notification.style.opacity = '1';
    notification.style.transform = 'translateY(0)';
  }, 100);
  
  // Удаляем через 3 секунды
  setTimeout(() => {
    notification.style.opacity = '0';
    notification.style.transform = 'translateY(20px)';
    setTimeout(() => notification.remove(), 300);
  }, 3000);
}

// Функция для добавления в избранное
async function addToFavorites(chatTitle, messageText = '') {
  try {
    const favorite = {
      title: chatTitle,
      url: window.location.href,
      timestamp: new Date().toISOString(),
      description: messageText || ''
    };
    
    // Сохраняем и ждем результата
    await new Promise((resolve, reject) => {
      chrome.storage.sync.get(['favorites'], (result) => {
        try {
          const favorites = result.favorites || [];
          console.log('Current favorites:', favorites);
          
          // Проверяем, нет ли уже такого чата
          if (!favorites.some(f => f.url === favorite.url)) {
            favorites.push(favorite);
            chrome.storage.sync.set({ favorites }, () => {
              if (chrome.runtime.lastError) {
                console.error('Error saving favorite:', chrome.runtime.lastError);
                reject(chrome.runtime.lastError);
              } else {
                console.log('Favorite saved successfully:', favorite);
                showNotification(`Added to Favorites! ⭐\n"${chatTitle}"`, false);
                resolve();
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
  return 'Chat ' + new Date().toLocaleString();
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