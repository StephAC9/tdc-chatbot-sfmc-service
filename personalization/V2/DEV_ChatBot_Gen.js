(function () {

  window.onerror = function(msg, url, line) {
  console.error("🔥 JS ERROR:", msg, "at", line);
};

/* ==========================================================================
   CONFIG
========================================================================== */

const BASE_URL = "https://tdc-chatbot-service.netlify.app/chatbot-proxy";
const API_KEY  = "";
const MIN_THINKING_TIME = 1200;
const DEBUG = true;
const USER_AVATAR = "https://image.email.tdc.dk/lib/fe2c11737364047b751c77/m/1/2683dc74-1df6-49f4-a2fe-6416e8bdc5ac.png";
let selectedEventName = null;
const SESSION_TIMEOUT = 3 * 60 * 1000; // 3 minutes
const STORAGE_KEYS = {
  LAST_ACTIVE: "chat_last_active",
  CUSTOMER_NAME: "chat_customer_name"
};

/* ==========================================================================
   DOM
========================================================================== */

const qs = sel => document.querySelector(sel);
const getChatContainer = () => qs("#chatContainer");

/* ✅ ADD HERE 👇 */
function clearChat() {
  const c = getChatContainer();
  if (!c) return;
  c.innerHTML = "";
  log("🧹 Chat cleared");
}

function scrollToBottom() {
  requestAnimationFrame(() => {
    const c = getChatContainer();
    if (c) c.scrollTop = c.scrollHeight;
  });
}

/* ==========================================================================
   SESSION HANDLING
========================================================================== */
  function updateLastActivity() {
    localStorage.setItem(STORAGE_KEYS.LAST_ACTIVE, Date.now());
  }

  function isSessionValid() {
    const last = localStorage.getItem(STORAGE_KEYS.LAST_ACTIVE);
    if (!last) return false;

    return Date.now() - last < SESSION_TIMEOUT;
  }

  function resetChatSession() {
    log("♻️ Resetting chat session");

    localStorage.removeItem(STORAGE_KEYS.LAST_ACTIVE);
    localStorage.removeItem(STORAGE_KEYS.CUSTOMER_NAME);

    clearChat?.(); // ✅ safe call
  }

  /* ==========================================================================
   INIT
========================================================================== */

  (function initSessionCheck() {
    if (!isSessionValid()) {
      resetChatSession();
    }
  })();

/* ==========================================================================
   USER IDENTIFICATION
========================================================================== */

function getUserId() {
  let id = localStorage.getItem("chat_user_id");

  if (!id) {
    id = "user_" + Math.random().toString(36).substring(2, 10);
    localStorage.setItem("chat_user_id", id);
  }

  return id;
}

/* ==========================================================================
   HELPERS
========================================================================== */

function getLastUserMessage() {
  const messages = document.querySelectorAll(".userMessage");
  if (!messages.length) return null;
  return messages[messages.length - 1].textContent;
}

function handleSuccess(eventName, username) {
  renderAgentMessage(
    `🎉 Hurra ${username}! Du er nu tilmeldt ${eventName}.`
  );

  renderAgentMessage(
    "Du vil inden længe modtage en bekræftelse på e-mail."
  );
}

function onEventSelected(item) {
  selectedEventName = item.name;
}

/* ==========================================================================
   LOGGING
========================================================================== */

function log(...args) {
  if (DEBUG) console.log("[CHATBOT]", ...args);
}

/* ==========================================================================
   ASSISTANT
========================================================================== */

function assignRandomAssistant() {
  const profiles = [
    { name: "David", image: "https://image.email.tdc.dk/lib/fe2c11737364047b751c77/m/1/9eaac0b4-553d-411f-801f-c25b08ae6b94.jpg" },
    { name: "Mathilde", image: "https://image.email.tdc.dk/lib/fe2c11737364047b751c77/m/1/6964161f-727b-45fd-8c07-3e62dff7867b.jpg" },
    { name: "Andreas", image: "https://image.email.tdc.dk/lib/fe2c11737364047b751c77/m/1/a111022c-6a50-4c4a-b7da-6a59f4e79ff8.jpg" },
    { name: "Mira", image: "https://image.email.tdc.dk/lib/fe2c11737364047b751c77/m/1/b0b8d809-6e66-4e5b-8ce2-3bb4ad1a9c91.jpg" },
    { name: "Alma", image: "https://i.imgur.com/Whlk887.png" }
  ];
  return profiles[Math.floor(Math.random() * profiles.length)];
}

const AGENT = assignRandomAssistant();
log("✅ Assistant:", AGENT.name);

/* ==========================================================================
   STATE (CRITICAL)
========================================================================== */

const conversationState = {
  categoryId: null,
  topicId: null
};

function logState(step) {
  log("🧭 STATE@" + step, JSON.stringify(conversationState));
}

/* ==========================================================================
   AGENT FIGURE
========================================================================== */

function showAgentFigurine() {
  const fig = qs(".chatbotFigure");
  if (!fig) return;

  fig.style.backgroundImage = `url('${AGENT.image}')`;
  fig.classList.remove("hide");

  log("🤖 Figurine visible");
}

/* ==========================================================================
   MESSAGES
========================================================================== */

function renderAgentMessage(text) {
  log("Agent:", text);
  const c = getChatContainer();

  const el = document.createElement("div");
  el.className = "agentMessageWrapper";
  el.innerHTML = `
    <div class="chatbotAvatar" style="background-image:url('${AGENT.image}')"></div>
    <p class="agentMessage">${text}</p>
  `;

  c.appendChild(el);
  scrollToBottom();
}

function renderUserMessage(text) {
  log("User:", text);
  const c = getChatContainer();

  const el = document.createElement("div");
  el.className = "userMessageWrapper";
  el.innerHTML = `
    <p class="userMessage">${text}</p>
    <div class="userAvatar" style="background-image:url('${USER_AVATAR}')"></div>
  `;

  c.appendChild(el);
  scrollToBottom();
}

/* ==========================================================================
   LOADER
========================================================================== */

function showThinking() {
  const el = document.createElement("div");
  el.className = "agentMessageWrapper loading";
  el.innerHTML = `<div class="bouncingDots"><div></div><div></div><div></div></div>`;
  getChatContainer().appendChild(el);
}

function hideThinking() {
  qs(".agentMessageWrapper.loading")?.remove();
}

/* ==========================================================================
   FETCH
========================================================================== */

async function fetchChatbot(params = {}) {
  const query = new URLSearchParams({ apikey: API_KEY, ...params }).toString();
  log("📡 FETCH:", query);

  showThinking();
  try {
    const res = await fetch(`${BASE_URL}?${query}`);
    await new Promise(r => setTimeout(r, MIN_THINKING_TIME));
    const data = await res.json();
    log("📦 RESPONSE:", data);
    return data;
  } finally {
    hideThinking();
  }
}

/* ==========================================================================
   OPTIONS
========================================================================== */

function renderOptions(options, cls, wrapCls) {
  const wrap = document.createElement("div");
  wrap.className = wrapCls;

  options.forEach(o => {
    const b = document.createElement("button");
    b.className = cls;
    b.dataset.id = o.id;
    b.textContent = o.label;
    wrap.appendChild(b);
  });

  getChatContainer().appendChild(wrap);
}

/* ==========================================================================
   ✅ NEW: LIST RENDER (EVENT + PRODUCT)
========================================================================== */

function renderListInChat(items = [], type) {
  if (!items.length) return;

  log(`📋 Rendering ${type} list`);

  const wrap = document.createElement("div");
  wrap.className = "chatListContainer";

  items.forEach(item => {
    const el = document.createElement("div");
    el.className = "chatListItem";

    el.innerHTML = `
      <span class="chatListIcon">${type === "Event" ? "📅" : "🛒"}</span>
      <span>${item.name}</span>
    `;

    el.onclick = () => {
        log("🖱 Event selected:", item);

        onEventSelected(item);
        renderUserMessage(item.name);

        renderAgentMessage(
            "Jeg skal bruge nogle oplysninger for at kunne hjælpe dig videre. Udfyld venligst formularen herunder."
        );

        renderLeadForm(); // ✅ ADD FORM
    };

    wrap.appendChild(el);
  });

  getChatContainer().appendChild(wrap);
  scrollToBottom();
}

function renderLeadForm() {
    log("🧾 Rendering lead form");

    const c = getChatContainer();
    if (!c) return;

    const formWrapper = document.createElement("div");
    formWrapper.className = "leadFormWrapper";

    formWrapper.innerHTML = `
        <form id="sfmc_custom_personalized_form" class="mainform" accept-charset="UTF-8">
            <div class="input-wrapper">
                <div class="search-icon">
                  <svg viewBox="0 0 48 48">
                    <path fill-rule="evenodd" clip-rule="evenodd"
                      d="M33 18c0 8.284-6.716 15-15 15-8.284 0-15-6.716-15-15C3 9.716 9.716 3 18 3c8.284 0 15 6.716 15 15zm-3.376 13.744A17.928 17.928 0 0118 36C8.059 36 0 27.941 0 18S8.059 0 18 0s18 8.059 18 18c0 4.43-1.6 8.486-4.255 11.622L47.562 45.44a1.5 1.5 0 11-2.122 2.122L29.624 31.744z">
                    </path>
                  </svg>
                </div>

                <input
                  type="text"
                  id="company"
                  name="Company"
                  required
                  oninvalid="this.setCustomValidity('Angiv din virksomheds navn.')"
                  oninput="this.setCustomValidity('')"
                  spellcheck="false"
                  autocomplete="off"
                />
                <label class="floating-label"> Virksomhedsnavn eller CVR *</label>

                <div class="spinner" id="spinner"></div>
                <button id="cancelBtn" class="cancel-btn" aria-label="Luk">&times;</button>
                <div id="results"></div>
            </div>
            <div id="statusMessage"></div>

            <div class="floating-group">
                <input
                  class="inputField"
                  type="text"
                  id="name"
                  name="Name"
                  required
                  oninvalid="this.setCustomValidity('Angiv dit navn.')"
                  oninput="this.setCustomValidity('')"
                  maxlength="150"
                  spellcheck="false"
                  autocomplete="off"
                />
                <label for="name">Navn *</label>
            </div>
              
            <div class="floating-group">
                <input class="inputField"
                  type="tel" 
                  id="phone" 
                  name="Phone" 
                  required 
                  pattern="[0-9]{8}" 
                  oninvalid="this.setCustomValidity('Angiv dit telefonnummer. (8 cifre)')" 
                  oninput="this.setCustomValidity('')" 
                  maxlength="24" 
                  spellcheck="false" 
                  autocomplete="off"
                />
                <label for="phone">Telefonnummer *</label>
            </div>
             
            <div class="floating-group">
                <input class="inputField"
                  type="email"
                  id="email"
                  name="Email"
                  required
                  oninvalid="this.setCustomValidity('Angiv en gyldig e-mailadresse.')"
                  oninput="this.setCustomValidity('')"
                  spellcheck="false"
                  autocomplete="off"
                />
                <label for="email">E-mail *</label>
            </div>

            <div class="floating-group hide">
                <textarea 
                  id="comment" 
                  name="comment" 
                  placeholder="" 
                  spellcheck="false" 
                  autocomplete="off"
              >
              </textarea>
               <label for="comment"></label>
            </div>
            <labe class="btn-label">
              <button class="btn-submit" type="submit">Bliv kontaktet</button>
            </labe>
            <input type="hidden" id="cvr" name="Cvr">
        </form>
    `;

    c.appendChild(formWrapper);
    scrollToBottom();

    // ✅ attach autocomplete AFTER DOM exists
    bindCompanyAutocomplete(formWrapper);


    // ✅ handle submit
    const form = formWrapper.querySelector("#sfmc_custom_personalized_form");
    const nameInput = formWrapper.querySelector("#name");
    form.addEventListener("submit", (e) => {

      // ✅ Check validity FIRST
      if (!form.checkValidity()) {
        return; // let browser show validation UI
      }

      e.preventDefault(); // ✅ AFTER validation passes

      
      const name = nameInput.value.trim();

      if (name) {
        localStorage.setItem(STORAGE_KEYS.CUSTOMER_NAME, name);
      }

      log("✅ Lead form submitted");

      handleSuccess(selectedEventName, name);

      formWrapper.remove();
    });
}

function bindCompanyAutocomplete(formWrapper) {

  /* =========================================================
     STATE
  ========================================================= */

  let debounceTimer;
  const DEBOUNCE_DELAY = 400;

  let companySelected = false;
  const cache = {};


  /* =========================================================
     DOM
  ========================================================= */

  const companyInput    = formWrapper.querySelector("#company");
  const spinner         = formWrapper.querySelector("#spinner");
  const resultContainer = formWrapper.querySelector("#results");
  const statusMessage   = formWrapper.querySelector("#statusMessage");
  const cancelBtn       = formWrapper.querySelector("#cancelBtn");
  const hiddenCVR       = formWrapper.querySelector("#cvr");

  if (!companyInput || !resultContainer) {
    log("⚠ Company input not found");
    return;
  }


  /* =========================================================
     HELPERS
  ========================================================= */

  const normalize = str => str.toLowerCase().trim();

  const showSpinner = () => spinner?.classList.add("active");
  const hideSpinner = () => spinner?.classList.remove("active");

  const showCancel = () => cancelBtn && (cancelBtn.style.display = "flex");
  const hideCancel = () => cancelBtn && (cancelBtn.style.display = "none");


  /* =========================================================
     INITIAL STATE
  ========================================================= */

  hideCancel();
  hideSpinner();


  /* =========================================================
     INPUT HANDLER (NO CANCEL HERE ✅)
  ========================================================= */

  companyInput.addEventListener("input", () => {

    if (companySelected) return;

    const value = companyInput.value.trim();

    resultContainer.innerHTML = "";
    resultContainer.style.display = "none";
    statusMessage.style.display = "none";

    if (!value) {
      hideSpinner();
      return;
    }

    showSpinner();

    clearTimeout(debounceTimer);

    debounceTimer = setTimeout(() => {
      performSearch(value);
    }, DEBOUNCE_DELAY);
  });


  /* =========================================================
     SEARCH
  ========================================================= */

  async function performSearch(query) {

    const searchValue = normalize(query);

    if (searchValue.length <= 3) {
      statusMessage.textContent =
        "Skriv mindst 3 tegn for at søge efter virksomhed.";
      statusMessage.style.display = "block";

      hideSpinner();
      return;
    }

    if (cache[searchValue]) {
      renderResults(cache[searchValue]);
      return;
    }

    try {

      showSpinner();

      const url = `https://tdc-company-api.netlify.app/cvr-proxy?term=${encodeURIComponent(searchValue)}`;

      const response = await fetch(url);
      const data = await response.json();

      let companies = Array.isArray(data) ? data : [data];

      const filtered = companies
        .filter(c =>
          normalize(c.name).includes(searchValue) ||
          (c.cvrNumber && c.cvrNumber.toString().includes(searchValue))
        )
        .sort((a, b) => a.name.localeCompare(b.name))
        .slice(0, 10);

      cache[searchValue] = filtered;

      renderResults(filtered);

    } catch (err) {

      log("❌ CVR ERROR:", err);

      statusMessage.textContent = "Ingen virksomheder fundet";
      statusMessage.style.display = "block";

      hideSpinner();
    }
  }


  /* =========================================================
     RENDER RESULTS
  ========================================================= */

  function renderResults(list) {

    hideSpinner();

    if (!list.length) {
      statusMessage.textContent = "Ingen virksomheder fundet";
      statusMessage.style.display = "block";
      resultContainer.style.display = "none";
      return;
    }

    resultContainer.innerHTML = "";
    resultContainer.style.display = "block";

    list.forEach(company => {

      const div = document.createElement("div");
      div.className = "result-item";
      div.textContent = company.name;

      div.addEventListener("mousedown", e => {
        e.preventDefault();
        selectCompany(company);
      });

      resultContainer.appendChild(div);
    });
  }


  /* =========================================================
     SELECT COMPANY (SHOW CANCEL HERE ✅)
  ========================================================= */

  function selectCompany(company) {

    companySelected = true;

    companyInput.value = company.name;
    companyInput.readOnly = true;

    hiddenCVR.value = company.cvrNumber || "";

    resultContainer.style.display = "none";
    statusMessage.style.display = "none";

    showCancel();    // ✅ ONLY HERE
    hideSpinner();
  }


  /* =========================================================
     CANCEL BUTTON
  ========================================================= */

  cancelBtn?.addEventListener("click", () => {

    companyInput.value = "";
    companyInput.readOnly = false;

    hiddenCVR.value = "";
    companySelected = false;

    resultContainer.style.display = "none";
    statusMessage.style.display = "none";

    hideCancel();   // ✅ hide
    hideSpinner();
  });


  /* =========================================================
     CLICK OUTSIDE
  ========================================================= */

  document.addEventListener("click", (e) => {

    const inside =
      companyInput.contains(e.target) ||
      resultContainer.contains(e.target);

    if (!inside) {
      resultContainer.style.display = "none";
      statusMessage.style.display = "none";
      hideSpinner();
    }
  });

}

/* ==========================================================================
   OVERLAY
========================================================================== */

function openOverlay(type, items) {
  const overlay = qs("#chatOverlay");
  const content = qs("#overlayContent");

  content.innerHTML = "";

  items.forEach(item => {
    const el = document.createElement("div");
    el.className = "overlayCard";

    el.innerHTML = `
      <h4>${item.name}</h4>
      ${item.description ? `<p>${item.description}</p>` : ""}
    `;

    content.appendChild(el);
  });

  overlay.classList.remove("hide");
}

function closeOverlay() {
  qs("#chatOverlay").classList.add("hide");
}

function bindOverlayClose() {
  qs("#closeOverlayBtn")?.addEventListener("click", closeOverlay);
}

/* ==========================================================================
   RESPONSE HANDLER (FINAL FIX)
========================================================================== */

function handleServerResponse(data) {
  log("📦 HANDLE", {
    done: data.done,
    state: data.state,
    responseType: data.response?.type
  });

  /* =========================
     TERMINAL NODE
  ========================= */

  if (data.done && data.response) {

    const r = data.response;
    log("✅ TERMINAL:", r.type);

    // ✅ Only render ONE message
    if (r.message) renderAgentMessage(r.message);

    /* EVENT */
    if (r.type === "Event") {
      renderListInChat(r.data || [], "Event");
      openOverlay("Event", r.data || []);
    }

    /* PRODUCT */
    if (r.type === "Product") {
      renderListInChat(r.data || [], "Product");
      openOverlay("Product", r.data || []);
    }

    if (r.followupPrompt) {
      renderAgentMessage(r.followupPrompt);
    }

    return;
  }

  /* =========================
     ✅ EMPTY OPTIONS (FIXED ORDER)
  ========================= */

  if (Array.isArray(data.options) && data.options.length === 0) {

    const lastChoice = getLastUserMessage() || "dit valg";

    log("⚠ EMPTY OPTIONS for:", lastChoice);

    renderAgentMessage(
      `Beklager, jeg kunne ikke finde nogen kommende events for "${lastChoice}".`
    );

    renderAgentMessage(
      "Prøv venligst et andet valg, eller vælg en anden kategori."
    );

    return;
  }

  /* =========================
     NORMAL FLOW (ONLY IF options exist)
  ========================= */

  if (data.prompt) {
    renderAgentMessage(data.prompt);
  }

  if (!data.state.categoryId) {
    renderOptions(data.options, "categoryItem", "categoriesContainer");
  }
  else if (data.state.categoryId && !data.state.topicId) {
    renderOptions(data.options, "topicItem", "topicsContainer");
  }
  else if (data.state.topicId && !data.state.subtopicId) {
    renderOptions(data.options, "subTopicItem", "subTopicsContainer");
  }
}

/* ==========================================================================
   ROUTER (FIXED)
========================================================================== */

function bindRouter() {
  const c = getChatContainer();
  if (!c || c.dataset.bound) return;

  c.dataset.bound = "true";

  c.addEventListener("click", async e => {
    const t = e.target;

    if (t.classList.contains("categoryItem")) {
      conversationState.categoryId = t.dataset.id;
      conversationState.topicId = null;
      logState("CATEGORY");

      renderUserMessage(t.textContent);

      handleServerResponse(await fetchChatbot({
        categoryid: conversationState.categoryId
      }));
    }

    if (t.classList.contains("topicItem")) {
      conversationState.topicId = t.dataset.id;
      logState("TOPIC");

      renderUserMessage(t.textContent);

      handleServerResponse(await fetchChatbot({
        categoryid: conversationState.categoryId,
        topicid: conversationState.topicId
      }));
    }

    if (t.classList.contains("subTopicItem")) {
      logState("SUBTOPIC");

      renderUserMessage(t.textContent);

      handleServerResponse(await fetchChatbot({
        categoryid: conversationState.categoryId,
        topicid: conversationState.topicId,
        subtopicid: t.dataset.id
      }));
    }
  });

  log("✅ Router bound");
}

/* ==========================================================================
   AGENT CLICK
========================================================================== */
function bindAgentClick() {

  qs(".chatbotFigure").addEventListener("click", async () => {

    const hasValidSession = isSessionValid();
    const customerName = localStorage.getItem(STORAGE_KEYS.CUSTOMER_NAME);

    qs(".chatbotFigure").classList.add("hide");
    qs("#chatCanvas").classList.remove("hide");

    /* ✅ RESET if session expired */
    if (!hasValidSession) {
      resetChatSession();
    }

    const firstOpen = !localStorage.getItem(STORAGE_KEYS.LAST_ACTIVE);

    /* ✅ ALWAYS show message when opening chat */
    if (!hasValidSession || firstOpen) {

      clearChat(); // ✅ ensure fresh UI for new session

      if (customerName) {
        renderAgentMessage(
          `Hej ${customerName} 👋 Velkommen tilbage!`
        );
      } else {
        renderAgentMessage(
          `Hej! Jeg er ${AGENT.name}, din virtuelle supportagent.`
        );
      }

      handleServerResponse(await fetchChatbot());
    }
    else {
      /* ✅ Returning user within active session */
      if (customerName) {
        renderAgentMessage(`Hej igen ${customerName} 👋`);
      } else {
        renderAgentMessage(`Hej igen 👋`);
      }
    }

    updateLastActivity();
  });
}

/* ==========================================================================
   APPLY
========================================================================== */

function apply(context, template) {
  log("🚀 APPLY");

  SalesforceInteractions.cashDom("body").append(template(context));

  showAgentFigurine();
  bindAgentClick();
  bindRouter();
  bindOverlayClose();

  qs("#closechatCanvasBtn")?.addEventListener("click", () => {
    qs("#chatCanvas").classList.add("hide");
    showAgentFigurine();
  });
}

function control(){}

function reset(){
  qs("#chatbot")?.remove();
}

registerTemplate({ apply, control, reset });

})();


/*(function () {

/* ==========================================================================
   CONFIG
========================================================================== 

const BASE_URL = "https://tdc-chatbot-service.netlify.app/chatbot-proxy";
const API_KEY  = "";
const MIN_THINKING_TIME = 1200;
const DEBUG = true;
const USER_AVATAR = "https://image.email.tdc.dk/lib/fe2c11737364047b751c77/m/1/2683dc74-1df6-49f4-a2fe-6416e8bdc5ac.png";

/* ==========================================================================
   HELPERS
========================================================================== 

function getLastUserMessage() {
  const messages = document.querySelectorAll(".userMessage");
  if (!messages.length) return null;
  return messages[messages.length - 1].textContent;
}

/* ==========================================================================
   LOGGING
========================================================================== 

function log(...args) {
  if (DEBUG) console.log("[CHATBOT]", ...args);
}

/* ==========================================================================
   ASSISTANT
==========================================================================

function assignRandomAssistant() {
  const profiles = [
    { name: "David", image: "https://image.email.tdc.dk/lib/fe2c11737364047b751c77/m/1/9eaac0b4-553d-411f-801f-c25b08ae6b94.jpg" },
    { name: "Mathilde", image: "https://image.email.tdc.dk/lib/fe2c11737364047b751c77/m/1/6964161f-727b-45fd-8c07-3e62dff7867b.jpg" },
    { name: "Andreas", image: "https://image.email.tdc.dk/lib/fe2c11737364047b751c77/m/1/a111022c-6a50-4c4a-b7da-6a59f4e79ff8.jpg" },
    { name: "Mira", image: "https://image.email.tdc.dk/lib/fe2c11737364047b751c77/m/1/b0b8d809-6e66-4e5b-8ce2-3bb4ad1a9c91.jpg" },
    { name: "Alma", image: "https://i.imgur.com/Whlk887.png" }
  ];
  return profiles[Math.floor(Math.random() * profiles.length)];
}

const AGENT = assignRandomAssistant();
log("✅ Assistant:", AGENT.name);

/* ==========================================================================
   STATE (CRITICAL)
========================================================================== 

const conversationState = {
  categoryId: null,
  topicId: null
};

function logState(step) {
  log("🧭 STATE@" + step, JSON.stringify(conversationState));
}

/* ==========================================================================
   DOM
========================================================================== 

const qs = sel => document.querySelector(sel);
const getChatContainer = () => qs("#chatContainer");

function scrollToBottom() {
  requestAnimationFrame(() => {
    const c = getChatContainer();
    if (c) c.scrollTop = c.scrollHeight;
  });
}

/* ==========================================================================
   AGENT FIGURE
========================================================================== 

function showAgentFigurine() {
  const fig = qs(".chatbotFigure");
  if (!fig) return;

  fig.style.backgroundImage = `url('${AGENT.image}')`;
  fig.classList.remove("hide");

  log("🤖 Figurine visible");
}

/* ==========================================================================
   MESSAGES
========================================================================== 

function renderAgentMessage(text) {
  log("Agent:", text);
  const c = getChatContainer();

  const el = document.createElement("div");
  el.className = "agentMessageWrapper";
  el.innerHTML = `
    <div class="chatbotAvatar" style="background-image:url('${AGENT.image}')"></div>
    <p class="agentMessage">${text}</p>
  `;

  c.appendChild(el);
  scrollToBottom();
}

function renderUserMessage(text) {
  log("User:", text);
  const c = getChatContainer();

  const el = document.createElement("div");
  el.className = "userMessageWrapper";
  el.innerHTML = `
    <p class="userMessage">${text}</p>
    <div class="userAvatar" style="background-image:url('${USER_AVATAR}')"></div>
  `;

  c.appendChild(el);
  scrollToBottom();
}

/* ==========================================================================
   LOADER
========================================================================== 

function showThinking() {
  const el = document.createElement("div");
  el.className = "agentMessageWrapper loading";
  el.innerHTML = `<div class="bouncingDots"><div></div><div></div><div></div></div>`;
  getChatContainer().appendChild(el);
}

function hideThinking() {
  qs(".agentMessageWrapper.loading")?.remove();
}

/* ==========================================================================
   FETCH
========================================================================== 

async function fetchChatbot(params = {}) {
  const query = new URLSearchParams({ apikey: API_KEY, ...params }).toString();
  log("📡 FETCH:", query);

  showThinking();
  try {
    const res = await fetch(`${BASE_URL}?${query}`);
    await new Promise(r => setTimeout(r, MIN_THINKING_TIME));
    const data = await res.json();
    log("📦 RESPONSE:", data);
    return data;
  } finally {
    hideThinking();
  }
}

/* ==========================================================================
   OPTIONS
========================================================================== 

function renderOptions(options, cls, wrapCls) {
  const wrap = document.createElement("div");
  wrap.className = wrapCls;

  options.forEach(o => {
    const b = document.createElement("button");
    b.className = cls;
    b.dataset.id = o.id;
    b.textContent = o.label;
    wrap.appendChild(b);
  });

  getChatContainer().appendChild(wrap);
}

/* ==========================================================================
   ✅ NEW: LIST RENDER (EVENT + PRODUCT
========================================================================== 

function renderListInChat(items = [], type) {
  if (!items.length) return;

  log(`📋 Rendering ${type} list`);

  const wrap = document.createElement("div");
  wrap.className = "chatListContainer";

  items.forEach(item => {
    const el = document.createElement("div");
    el.className = "chatListItem";

    el.innerHTML = `
      <span class="chatListIcon">${type === "Event" ? "📅" : "🛒"}</span>
      <span>${item.name}</span>
    `;

    el.onclick = () => {
      log("🖱 List click:", item);
      renderUserMessage(item.name);
      renderAgentMessage("Vil du vide mere om dette?");
    };

    wrap.appendChild(el);
  });

  getChatContainer().appendChild(wrap);
  scrollToBottom();
}

/* ==========================================================================
   OVERLAY
========================================================================== 

function openOverlay(type, items) {
  const overlay = qs("#chatOverlay");
  const content = qs("#overlayContent");

  content.innerHTML = "";

  items.forEach(item => {
    const el = document.createElement("div");
    el.className = "overlayCard";

    el.innerHTML = `
      <h4>${item.name}</h4>
      ${item.description ? `<p>${item.description}</p>` : ""}
    `;

    content.appendChild(el);
  });

  overlay.classList.remove("hide");
}

function closeOverlay() {
  qs("#chatOverlay").classList.add("hide");
}

function bindOverlayClose() {
  qs("#closeOverlayBtn")?.addEventListener("click", closeOverlay);
}

/* ==========================================================================
   RESPONSE HANDLER (FINAL FIX)
========================================================================== 

function handleServerResponse(data) {
  log("📦 HANDLE", {
    done: data.done,
    state: data.state,
    responseType: data.response?.type
  });

  /* =========================
     TERMINAL NODE
  ========================= 

  if (data.done && data.response) {

    const r = data.response;
    log("✅ TERMINAL:", r.type);

    // ✅ Only render ONE message
    if (r.message) renderAgentMessage(r.message);

    /* EVENT 
    if (r.type === "Event") {
      renderListInChat(r.data || [], "Event");
      openOverlay("Event", r.data || []);
    }

    /* PRODUCT 
    if (r.type === "Product") {
      renderListInChat(r.data || [], "Product");
      openOverlay("Product", r.data || []);
    }

    if (r.followupPrompt) {
      renderAgentMessage(r.followupPrompt);
    }

    return;
  }

  /* =========================
     ✅ EMPTY OPTIONS (FIXED ORDER)
  ========================= 

  if (Array.isArray(data.options) && data.options.length === 0) {

    const lastChoice = getLastUserMessage() || "dit valg";

    log("⚠ EMPTY OPTIONS for:", lastChoice);

    renderAgentMessage(
      `Beklager, jeg kunne ikke finde nogen kommende events for "${lastChoice}".`
    );

    renderAgentMessage(
      "Prøv venligst et andet valg, eller vælg en anden kategori."
    );

    return;
  }

  /* =========================
     NORMAL FLOW (ONLY IF options exist)
  ========================= 

  if (data.prompt) {
    renderAgentMessage(data.prompt);
  }

  if (!data.state.categoryId) {
    renderOptions(data.options, "categoryItem", "categoriesContainer");
  }
  else if (data.state.categoryId && !data.state.topicId) {
    renderOptions(data.options, "topicItem", "topicsContainer");
  }
  else if (data.state.topicId && !data.state.subtopicId) {
    renderOptions(data.options, "subTopicItem", "subTopicsContainer");
  }
}

function handleServerResponse(data) {

  log("📦 HANDLE", data);

  
  if (data.done && data.response) {

    const r = data.response;
    log("✅ TERMINAL:", r.type);

    // ✅ ONLY ONE MESSAGE
    if (r.message) renderAgentMessage(r.message);

    if (r.type === "Event") {
      renderListInChat(r.data || [], "Event");   // ✅ NEW
      openOverlay("Event", r.data || []);
    }

    if (r.type === "Product") {
      renderListInChat(r.data || [], "Product"); // ✅ NEW
      openOverlay("Product", r.data || []);
    }

    if (r.followupPrompt) {
      renderAgentMessage(r.followupPrompt);
    }

    return;
  }

  

  if (data.prompt) renderAgentMessage(data.prompt);

  if (!data.state.categoryId) {
    renderOptions(data.options, "categoryItem", "categoriesContainer");
  }
  else if (!data.state.topicId) {
    renderOptions(data.options, "topicItem", "topicsContainer");
  }
  else {
    renderOptions(data.options, "subTopicItem", "subTopicsContainer");
  }
}

/* ==========================================================================
   ROUTER (FIXED)
========================================================================== 

function bindRouter() {
  const c = getChatContainer();
  if (!c || c.dataset.bound) return;

  c.dataset.bound = "true";

  c.addEventListener("click", async e => {
    const t = e.target;

    if (t.classList.contains("categoryItem")) {
      conversationState.categoryId = t.dataset.id;
      conversationState.topicId = null;
      logState("CATEGORY");

      renderUserMessage(t.textContent);

      handleServerResponse(await fetchChatbot({
        categoryid: conversationState.categoryId
      }));
    }

    if (t.classList.contains("topicItem")) {
      conversationState.topicId = t.dataset.id;
      logState("TOPIC");

      renderUserMessage(t.textContent);

      handleServerResponse(await fetchChatbot({
        categoryid: conversationState.categoryId,
        topicid: conversationState.topicId
      }));
    }

    if (t.classList.contains("subTopicItem")) {
      logState("SUBTOPIC");

      renderUserMessage(t.textContent);

      handleServerResponse(await fetchChatbot({
        categoryid: conversationState.categoryId,
        topicid: conversationState.topicId,
        subtopicid: t.dataset.id
      }));
    }
  });

  log("✅ Router bound");
}

/* ==========================================================================
   AGENT CLICK
========================================================================== 

function bindAgentClick() {
  qs(".chatbotFigure").addEventListener("click", async () => {
    log("🤖 Agent clicked");

    qs(".chatbotFigure").classList.add("hide");
    qs("#chatCanvas").classList.remove("hide");

    if (!getChatContainer().children.length) {
      renderAgentMessage(`Hej! Jeg er ${AGENT.name}.`);
      handleServerResponse(await fetchChatbot());
    }
  });
}

/* ==========================================================================
   APPLY
========================================================================== 

function apply(context, template) {
  log("🚀 APPLY");

  SalesforceInteractions.cashDom("body").append(template(context));

  showAgentFigurine();
  bindAgentClick();
  bindRouter();
  bindOverlayClose();

  qs("#closechatCanvasBtn")?.addEventListener("click", () => {
    qs("#chatCanvas").classList.add("hide");
    showAgentFigurine();
  });
}

function control(){}

function reset(){
  qs("#chatbot")?.remove();
}

registerTemplate({ apply, control, reset });

})();



/*(function () {

/* ==========================================================================
   CONFIG
========================================================================== 

const BASE_URL = "https://tdc-chatbot-service.netlify.app/chatbot-proxy";
const API_KEY  = "";
const MIN_THINKING_TIME = 1200;
const DEBUG = true;
const USER_AVATAR = "https://image.email.tdc.dk/lib/fe2c11737364047b751c77/m/1/2683dc74-1df6-49f4-a2fe-6416e8bdc5ac.png";

/* ==========================================================================
   LOGGING
========================================================================== 

function log(...args) {
  if (DEBUG) console.log("[CHATBOT]", ...args);
}

/* ==========================================================================
   ASSISTANT
========================================================================== 

function assignRandomAssistant() {
  const profiles = [
    { name: "David", image: "https://image.email.tdc.dk/lib/fe2c11737364047b751c77/m/1/9eaac0b4-553d-411f-801f-c25b08ae6b94.jpg" },
    { name: "Mathilde", image: "https://image.email.tdc.dk/lib/fe2c11737364047b751c77/m/1/6964161f-727b-45fd-8c07-3e62dff7867b.jpg" },
    { name: "Andreas", image: "https://image.email.tdc.dk/lib/fe2c11737364047b751c77/m/1/a111022c-6a50-4c4a-b7da-6a59f4e79ff8.jpg" },
    { name: "Mira", image: 'https://image.email.tdc.dk/lib/fe2c11737364047b751c77/m/1/b0b8d809-6e66-4e5b-8ce2-3bb4ad1a9c91.jpg' },
    { name: "Alma", image: 'https://i.imgur.com/Whlk887.png'}
  ];
  const profile = profiles[Math.floor(Math.random() * profiles.length)];
  log("✅ Assistant selected:", profile.name);
  return profile;
}

const AGENT = assignRandomAssistant();

/* ==========================================================================
   CONVERSATION STATE (FIXES TOPIC BUG)
========================================================================== 

const conversationState = {
  categoryId: null,
  topicId: null
};

function logState(stage) {
  log("🧭 STATE@" + stage, JSON.stringify(conversationState));
}

/* ==========================================================================
   DOM
========================================================================== 

const qs = sel => document.querySelector(sel);
const getChatContainer = () => qs("#chatContainer");

const scrollToBottom = () => {
  const c = getChatContainer();
  if (!c) return;
  requestAnimationFrame(() => (c.scrollTop = c.scrollHeight));
};

/* ==========================================================================
   AGENT FIGURIN
========================================================================== 

function showAgentFigurine() {
  const f = qs(".chatbotFigure");
  if (!f) return;

  f.style.backgroundImage = `url('${AGENT.image}')`;
  f.classList.remove("hide");
  log("🤖 Figurine shown");
}

/* ==========================================================================
   CHAT RENDERING
========================================================================== 

function renderAgentMessage(text) {
  log("Agent:", text);
  const c = getChatContainer();
  const el = document.createElement("div");
  el.className = "agentMessageWrapper";
  el.innerHTML = `
    <div class="chatbotAvatar" style="background-image:url('${AGENT.image}')"></div>
    <p class="agentMessage">${text}</p>
  `;
  c.appendChild(el);
  scrollToBottom();
}

function renderUserMessage(text) {
  log("User:", text);

  const c = getChatContainer();
  if (!c) return;

  const el = document.createElement("div");
  el.className = "userMessageWrapper";

  el.innerHTML = `
    <p class="userMessage">${text}</p>
    <div class="userAvatar"
         style="background-image:url('${USER_AVATAR}')"></div>
  `;
  c.appendChild(el);
  scrollToBottom();
}

/* ==========================================================================
   LOADER
========================================================================== 

function showThinking() {
  const el = document.createElement("div");
  el.className = "agentMessageWrapper loading";
  el.innerHTML = `<div class="bouncingDots"><div></div><div></div><div></div></div>`;
  getChatContainer().appendChild(el);
}

function hideThinking() {
  qs(".agentMessageWrapper.loading")?.remove();
}

/* ==========================================================================
   FETCH
========================================================================== 

async function fetchChatbot(params = {}) {
  const query = new URLSearchParams({ apikey: API_KEY, ...params }).toString();
  log("📡 FETCH:", query);

  showThinking();
  try {
    const res = await fetch(`${BASE_URL}?${query}`);
    await new Promise(r => setTimeout(r, MIN_THINKING_TIME));
    const json = await res.json();
    log("📦 RESPONSE:", json);
    return json;
  } finally {
    hideThinking();
  }
}

/* ==========================================================================
   OPTIONS
========================================================================== 

function renderOptions(options, itemClass, wrapClass) {
  const wrap = document.createElement("div");
  wrap.className = wrapClass;

  options.forEach(o => {
    const b = document.createElement("button");
    b.className = itemClass;
    b.dataset.id = o.id;
    b.textContent = o.label;
    wrap.appendChild(b);
  });

  getChatContainer().appendChild(wrap);
  scrollToBottom();
}

/* ==========================================================================
   OVERLAY (EVENT / PRODUCT)
========================================================================== 

function openOverlay(type, items) {
  log("🪟 Overlay open:", type, items);

  const overlay = qs("#chatOverlay");
  const content = qs("#overlayContent");
  content.innerHTML = "";

  items.forEach(item => {
    const c = document.createElement("div");
    c.className = "overlayCard";
    c.innerHTML = `
      <h4>${item.name || ""}</h4>
      ${item.description ? `<p>${item.description}</p>` : ""}
      ${item.city ? `<p><b>By:</b> ${item.city}</p>` : ""}
      ${item.price ? `<p><b>Pris:</b> ${item.price}</p>` : ""}
    `;
    c.onclick = () => {
      log("🖱 Overlay card clicked:", item);
      renderUserMessage(item.name || "Valgt");
      renderAgentMessage("Vil du vide mere om dette?");
      closeOverlay();
    };
    content.appendChild(c);
  });

  overlay.classList.remove("hide");
}

function closeOverlay() {
  qs("#chatOverlay")?.classList.add("hide");
  qs("#overlayContent").innerHTML = "";
}

function bindOverlayClose() {
  qs("#closeOverlayBtn")?.addEventListener("click", closeOverlay);
}

/* ==========================================================================
   SERVER RESPONSE HANDLER (FULLY ALIGNED WITH SSJS)
========================================================================== 

function handleServerResponse(data) {
  log("📦 HANDLE", {
    done: data.done,
    state: data.state,
    responseType: data.response?.type
  });

  if (data.prompt) renderAgentMessage(data.prompt);

  if (data.done && data.response) {
    const r = data.response;

    if (r.type === "Knowledge") {
      renderAgentMessage(r.message);
    }

    if (r.type === "Event") {
      renderAgentMessage(r.message);
      openOverlay("Event", r.data || []);
    }

    if (r.type === "Product") {
      renderAgentMessage(r.message);
      openOverlay("Product", r.data || []);
    }

    if (r.followupPrompt) {
      renderAgentMessage(r.followupPrompt);
    }

    return;
  }

  if (!data.state.categoryId) {
    renderOptions(data.options, "categoryItem", "categoriesContainer");
  }
  else if (data.state.categoryId && !data.state.topicId) {
    renderOptions(data.options, "topicItem", "topicsContainer");
  }
  else if (data.state.topicId && !data.state.subtopicId) {
    renderOptions(data.options, "subTopicItem", "subTopicsContainer");
  }
}

/* ==========================================================================
   ROUTER (FIXED TOPIC LOGIC)
========================================================================== 

function bindRouter() {
  const c = getChatContainer();
  if (!c || c.dataset.bound) return;
  c.dataset.bound = "true";

  c.addEventListener("click", async e => {
    const t = e.target;

    if (t.classList.contains("categoryItem")) {
      conversationState.categoryId = t.dataset.id;
      conversationState.topicId = null;
      logState("CATEGORY");

      renderUserMessage(t.textContent);
      handleServerResponse(await fetchChatbot({
        categoryid: conversationState.categoryId
      }));
    }

    if (t.classList.contains("topicItem")) {
      conversationState.topicId = t.dataset.id;
      logState("TOPIC");

      renderUserMessage(t.textContent);
      handleServerResponse(await fetchChatbot({
        categoryid: conversationState.categoryId,
        topicid: conversationState.topicId
      }));
    }

    if (t.classList.contains("subTopicItem")) {
      logState("SUBTOPIC");

      renderUserMessage(t.textContent);
      handleServerResponse(await fetchChatbot({
        categoryid: conversationState.categoryId,
        topicid: conversationState.topicId,
        subtopicid: t.dataset.id
      }));
    }
  });

  log("✅ Router bound");
}

/* ==========================================================================
   AGENT CLICK
========================================================================== 

function bindAgentClick() {
  const fig = qs(".chatbotFigure");
  fig.addEventListener("click", async () => {
    log("🤖 Agent clicked");

    fig.classList.add("hide");
    qs("#chatCanvas")?.classList.remove("hide");

    if (getChatContainer().children.length === 0) {
      renderAgentMessage(`Hej! Jeg er ${AGENT.name}.`);
      handleServerResponse(await fetchChatbot());
    }
  });
}

/* ==========================================================================
   APPLY (EVERGAGE)
========================================================================== 

function apply(context, template) {
  log("🚀 APPLY");
  SalesforceInteractions.cashDom("body").append(template(context));

  showAgentFigurine();
  bindAgentClick();
  bindRouter();
  bindOverlayClose();

  qs("#closechatCanvasBtn")?.addEventListener("click", () => {
    qs("#chatCanvas")?.classList.add("hide");
    showAgentFigurine();
  });
}

function control() {
  log("CONTROL – chatbot not shown");
}

function reset() {
  qs("#chatbot")?.remove();
}

registerTemplate({ apply, control, reset });

})();*/