// Создаем пункт контекстного меню при установке расширения
chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: "addToFavorites",
    title: "Add to Favorites ⭐",
    contexts: ["page", "selection"],
    documentUrlPatterns: ["https://chat.deepseek.com/*"]
  });
});

// Слушаем сообщения от content script
chrome.runtime.onMessage.addListener((message, sender) => {
  if (message.action === "contentScriptReady") {
    console.log('Content script is ready in tab:', sender.tab.id);
  }
});

// Обработчик клика по пункту меню
chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId === "addToFavorites") {
    // Проверяем, что вкладка существует и активна
    chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
      if (tabs[0] && tabs[0].id === tab.id) {
        chrome.tabs.sendMessage(tab.id, {
          action: "addToFavorites",
          selectionText: info.selectionText || ''
        }).catch(error => {
          console.error('Error sending message:', error);
          // Если возникла ошибка, возможно content script не загружен
          // Перезагружаем страницу и пробуем снова через 2 секунды
          chrome.tabs.reload(tab.id);
          setTimeout(() => {
            chrome.tabs.sendMessage(tab.id, {
              action: "addToFavorites",
              selectionText: info.selectionText || ''
            }).catch(error => {
              console.error('Error after reload:', error);
            });
          }, 2000);
        });
      }
    });
  }
}); 