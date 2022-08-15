const storageCache = {};

// Asynchronously retrieve data from storage.sync, then cache it.
const initStorageCache = getAllStorageSyncData().then((items) => {
  // Copy the data retrieved from storage into storageCache.
  Object.assign(storageCache, items);
});

// Reads all data out of storage.sync and exposes it via a promise.
//
// Note: Once the Storage API gains promise support, this function
// can be greatly simplified.
function getAllStorageSyncData() {
  return new Promise((resolve, reject) => {
    chrome.storage.sync.get(["apikey", "customerId", "results", "corpusIds"], (items) => {
      resolve(items);
    });
  });
}

/**
 * Inject CSS and Javascript into the current tab. The injection is
 * idempotent, so running multiple times has no negative effects.
 * @param {*} tab
 */
function inject(tab) {
  chrome.scripting.insertCSS({
    target: { tabId: tab.id },
    files: ["search.css"],
  });
  chrome.scripting.executeScript(
    {
      target: { tabId: tab.id },
      files: ["search.js"],
    },
    () => {}
  );
}

/**
 * Runs the specified query.
 * @param {*} query
 * @returns a promise
 */
async function runQuery(query, responseFn) {
  try {
    await getAllStorageSyncData().then((items) => {
      // Copy the data retrieved from storage into storageCache.
      Object.assign(storageCache, items);
    });
  } catch (e) {
    // Handle error that occurred during storage initialization.
    return null;
  }

  if (
    !storageCache.apikey ||
    !storageCache.customerId ||
    !storageCache.results ||
    !storageCache.corpusIds ||
    storageCache.corpusIds.length == 0
  ) {
    responseFn({
      type: "search-results",
      query: query,
      results: null,
      error: {
        code: 1,
        message: "Plugin is not configured. Configure it before searching.",
      },
    });
    return null;
  }

  let corpusKeys = [];
  const corpora = storageCache.corpusIds;
  for (const k of corpora) {
    corpusKeys.push({
      customer_id: storageCache.customerId,
      corpus_id: k,
    });
  }

  await fetch(url, {
    method: "post",
    body: JSON.stringify({
      query: [
        {
          query: query,
          num_results: storageCache.results,
          corpus_key: corpusKeys,
        },
      ],
    }),
    headers: {
      "customer-id": `${storageCache.customerId}`,
      "x-api-key": `${storageCache.apikey}`,
      "Content-Type": "application/json",
    },
  })
    .then((res) => res.json())
    .then((resultSet) => {
      if (resultSet.code === undefined) {
        // We still need to check the case where the resultSet is empty
        // and there are statuses embedded in it.
        let responseSet = resultSet.responseSet[0];
        if (responseSet.response.length == 0 && responseSet.status.length > 0) {
          let e = responseSet.status[0];
          responseFn({
            type: "search-results",
            query: query,
            results: null,
            error: { code: e.code, message: e.statusDetail },
          });
        } else {
          responseFn({
            type: "search-results",
            query: query,
            results: resultSet,
            error: null,
          });
        }
      } else {
        responseFn({
          type: "search-results",
          query: query,
          results: null,
          error: { code: resultSet.code, message: resultSet.message },
        });
      }
    })
    .catch((err) => {
      responseFn({
        type: "search-results",
        query: query,
        results: null,
        error: err,
      });
    });
}

chrome.runtime.onInstalled.addListener(function () {
  chrome.contextMenus.create({
    title: "Search for '%s'",
    contexts: ["selection"],
    id: "4544",
  });
});

chrome.action.onClicked.addListener(function (tab) {
  inject(tab);
  chrome.tabs.sendMessage(tab.id, {
    type: "toggle-popup",
  });
});

chrome.contextMenus.onClicked.addListener(function (info, tab) {
  inject(tab);
  // contextMenu will set toggle true for always whether popup is already open or not
  toggle = true;
  chrome.tabs.sendMessage(tab.id, {
    type: "begin-search",
    query: info.selectionText,
  });
  let sendResponse = function (message) {
    chrome.tabs.sendMessage(tab.id, message);
  };
  runQuery(info.selectionText, sendResponse);
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === "run-search") {
    runQuery(message.query, sendResponse);
  }
  // sendResponse becomes invalid when this method exits, unless you return
  // true below.
  return true;
});
