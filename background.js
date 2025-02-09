// Создаем пункт контекстного меню при установке расширения
chrome.runtime.onInstalled.addListener(() => {
  // First remove existing menu if it exists
  chrome.contextMenus.removeAll(() => {
    // Then create new one
    chrome.contextMenus.create({
      id: "addToFavorites",
      title: "Add to Favorites ⭐",
      contexts: ["all"],
      documentUrlPatterns: ["https://chat.deepseek.com/*"]
    }, () => {
      if (chrome.runtime.lastError) {
        console.error('Error creating context menu:', chrome.runtime.lastError);
      } else {
        console.log('Context menu created successfully');
      }
    });
  });
});

// Слушаем сообщения от content script
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === "contentScriptReady") {
    console.log('Content script is ready in tab:', sender.tab.id);
  }
});

// Обработчик клика по пункту меню
chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId === "addToFavorites") {
    console.log('Context menu clicked:', info, tab);
    
    // Отправляем сообщение в content script
    chrome.tabs.sendMessage(tab.id, {
      action: "addToFavorites",
      selectionText: info.selectionText || ''
    }, (response) => {
      if (chrome.runtime.lastError) {
        console.error('Error sending message:', chrome.runtime.lastError);
        // Если возникла ошибка, пробуем перезагрузить страницу и отправить снова
        chrome.tabs.reload(tab.id, {}, () => {
          setTimeout(() => {
            chrome.tabs.sendMessage(tab.id, {
              action: "addToFavorites",
              selectionText: info.selectionText || ''
            });
          }, 2000);
        });
      } else {
        console.log('Message sent successfully:', response);
      }
    });
  }
}); 