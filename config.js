document.addEventListener(
  "DOMContentLoaded",
  function () {
    loadConfig();
    const saveBtn = document.getElementById("save-btn");
    const successBtn = document.getElementById("success");
    const resultsSlider = document.getElementById("results");
    successBtn.style.display = "none";
    saveBtn.addEventListener("click", handleSave);
    resultsSlider.addEventListener("change", function (e) {
      setResultsTitle(e.target.value);
    });
  },
  false
);

/**
 * Set the number of results.
 * @param {integer} numResults
 */
function setResultsTitle(numResults) {
  document.getElementById("results-label").innerHTML =
      `Number of Results: ${numResults}`;
}

/**
 * Converts a string of comma-separated ids to a list of corpus ids. The
 * method is basically uncrasheable, but pay close attention to how it handles
 * invalid input.
 *
 * Examples:
 *   "" => []
 *   " " => []
 *   "3,45, 2" => [3, 45, 2]
 *   "3a, 45g2, abc" => [3, 45]
 *
 * @param {string} corpusIds
 */
function toArray(corpusIds) {
  if (corpusIds == null) {      // this actually handles null and undefined
    return [];
  }
  if (!corpusIds.trim()) {
    return [];
  }
  let result = [];
  for (const corpusId of corpusIds.split(",")) {
    let ival = parseInt(corpusId.trim());
    if (!isNaN(ival)) {
      result.push(ival);
    }
  }
  return result;
}

function loadConfig() {
  chrome.storage.sync.get(
    ["apikey", "customerId", "results", "corpusIds"],
    function (items) {
      document.getElementById("apikey").value = items.apikey || "";
      document.getElementById("customerId").value = items.customerId || "";

      let numResults = items.results || 0;
      document.getElementById("results").value = numResults;
      setResultsTitle(numResults);

      if (items.corpusIds) {
        document.getElementById("corpusId").value = items.corpusIds.join(", ");
      } else {
        document.getElementById("corpusId").value = "";
      }
    }
  );
}

function handleSave() {
  const apikey = document.getElementById("apikey").value;
  const customerId = document.getElementById("customerId").value;
  const resutls = document.getElementById("results").value;
  const corpusIds = toArray(document.getElementById("corpusId").value);
  chrome.storage.sync.set(
    {
      apikey: apikey,
      customerId: customerId,
      results: resutls,
      corpusIds: corpusIds,
    },
    function () {}
  );
  const successBtn = document.getElementById("success");
  const saveBtn = document.getElementById("save-btn");

  successBtn.style.display = "block";
  saveBtn.style.display = "none";
  setTimeout(() => {
    successBtn.style.display = "none";
    saveBtn.style.display = "block";
  }, 3000);
}
