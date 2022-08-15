if (document.getElementById("zir_ssp") === null) {
  ignoreTogglePopup = true;

  let font = new FontFace(
    "Open Sans", `url(${chrome.runtime.getURL('open-sans-v20-latin-regular.woff2')})`);
  document.fonts.add(font);

  function popupDefined() {
    return document.getElementById("zir_ssp") !== null;
  }

  function togglePopup() {
    let zirPopup = document.getElementById("zir_ssp");
    let display = zirPopup.style.display;
    if (display === "block") {
      zirPopup.style.display = "none";
    } else {
      zirPopup.style.display = "block";
    }
  }

  function showPopup() {
    let zirPopup = document.getElementById("zir_ssp");
    zirPopup.style.display = "block";
  }

  /**
   * Returns true if the popup is visible or false if it is not.
   */
  function isPopupVisible() {
    if (!popupDefined()) {
      return false;
    }
    let zirPopup = document.getElementById("zir_ssp");
    return zirPopup.style.display === "block";
  }

  /**
   * Change the UI to indicate that a search is in progress.
   * @param {String} query If non-null, set this query in the search box.
   */
  function beginSearch(query = null) {
    document.getElementById("zir_loader").classList.add("zir_search_loading");
    if (query !== null) {
      document.getElementById("zir_input_text").value = query;
    }
  }

  function runSearch(query) {
    chrome.runtime.sendMessage(
      {
        action: "run-search",
        query: query,
      },
      function (response) {
        renderResults(response);
      }
    );
  }

  /**
   * Create the ZIR Semantic Search Popup.
   */
  function createPopup() {
    let parent = document.createElement("div");
    parent.setAttribute("class", "zir_popup");
    parent.setAttribute("id", "zir_ssp");
    parent.style.display = "none";

    let imgUrl = chrome.runtime.getURL("logo.svg");
    let configUrl = chrome.runtime.getURL("config.html");

    parent.innerHTML = `
      <div class="header">
        <h2 class="left">ZIR Semantic Search</h2>
        <div>
          <svg xmlns="http://www.w3.org/2000/svg"
               fill="none"
               viewBox="0 0 24 24"
               stroke="currentColor"
               onclick="document.getElementById('zir_ssp').style.display = 'none';">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </div>
      </div>
      <div class="body">
        <div class="zir_searchbox">
          <input id="zir_input_text" placeholder="Search...">
          <button class="zir__logo_btn" id="search-btn">
            <img src="${imgUrl}" class="zir__search_logo" id="zir_loader"></img>
          </button>
        </div>
        <div id="zir_search_errors"></div>
        <div id="zir_search_results"></div>
        <a class="zir_config" href="${configUrl}" target="_blank">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
            <path fill-rule="evenodd" d="M11.49 3.17c-.38-1.56-2.6-1.56-2.98 0a1.532 1.532 0 01-2.286.948c-1.372-.836-2.942.734-2.106 2.106.54.886.061 2.042-.947 2.287-1.561.379-1.561 2.6 0 2.978a1.532 1.532 0 01.947 2.287c-.836 1.372.734 2.942 2.106 2.106a1.532 1.532 0 012.287.947c.379 1.561 2.6 1.561 2.978 0a1.533 1.533 0 012.287-.947c1.372.836 2.942-.734 2.106-2.106a1.533 1.533 0 01.947-2.287c1.561-.379 1.561-2.6 0-2.978a1.532 1.532 0 01-.947-2.287c.836-1.372-.734-2.942-2.106-2.106a1.532 1.532 0 01-2.287-.947zM10 13a3 3 0 100-6 3 3 0 000 6z" clip-rule="evenodd" />
          </svg>
          Settings
        </a>
      </div>
    `;
    return parent;
  }

  /**
   * Render search results in the popup window.
   * @param {serving.ResultSet} resultSet The result set to render.
   */
  function renderResults(message) {
    let errorsDiv = document.getElementById("zir_search_errors");
    let resultsDiv = document.getElementById("zir_search_results");

    if (message.error !== null) {
      document
        .getElementById("zir_loader")
        .classList.remove("zir_search_loading");

      resultsDiv.style.display = "none";
      errorsDiv.style.display = "block";
      errorsDiv.innerHTML =
        `Message: ${message.error.message} (Code: ${message.error.code})`;
    } else if (message.result === null) {
      document
        .getElementById("zir_loader")
        .classList.remove("zir_search_loading");
    } else {
      resultsDiv.style.display = "block";
      errorsDiv.style.display = "none";
      if (message.results?.responseSet) {
        const responseSet = message.results.responseSet[0];
        const responses = responseSet?.response;
        const documents = responseSet?.document;
        let txt =
        `<div>
           <ul>`;
        responses.forEach(({ text, documentIndex }, index) => {
          const meta = documents[documentIndex]?.metadata;
          if (text) {
            txt += `<li title="click to copy to clipboard">`;
            if (meta) {
              if (getTitle(meta)) {
                txt += `<a href="${getUrl(
                  meta
                )}" class="result_title" target="_blank">${getTitle(meta)}</a>`;
              } else {
                txt += `<span class="doc_id">Doc: ${
                  documents[documentIndex]?.id || ""
                }</span>`;
              }
            }
            txt += `<p class="result_text" onclick="navigator.clipboard.writeText(this.innerText);">${text}</p>`;
            txt += "</li>";
          }
        });
        txt += "</ul></div>";

        resultsDiv.innerHTML = txt;
      }
      document
        .getElementById("zir_loader")
        .classList.remove("zir_search_loading");
    }
  }

  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.type === "search-results") {
      document.getElementById("zir_input_text").value =
        message.query || window.getSelection().toString();
      renderResults(message);
    } else if (message.type === "begin-search") {
      showPopup();
      beginSearch(message.query);
    } else if (message.type === "toggle-popup") {
      let isShowing = !isPopupVisible();
      if (isShowing) {
        beginSearch(window.getSelection().toString());
        runSearch(window.getSelection().toString());
      }
      if (!ignoreTogglePopup) {
        togglePopup();
      } else {
        ignoreTogglePopup = false;
      }
    }
  });

  function getTitle(result) {
    let title = "";
    for (const metadata of result) {
      if ("title" === metadata.name) {
        title = metadata.value;
      }
    }
    return title;
  }

  function getUrl(result) {
    let url = "";
    for (const metadata of result) {
      if ("url" === metadata.name) {
        url = metadata.value;
      }
    }
    return url;
  }

  document.body.appendChild(createPopup());
  document
    .getElementById("zir_input_text")
    .addEventListener("keyup", function (event) {
      if (event.key === "Enter") {
        beginSearch();
        runSearch(document.getElementById("zir_input_text").value);
      }
    });
  document.getElementById("search-btn").addEventListener("click", function () {
    beginSearch();
    runSearch(document.getElementById("zir_input_text").value);
  });
  document.getElementById("zir_ssp").style.display = "block";
}
