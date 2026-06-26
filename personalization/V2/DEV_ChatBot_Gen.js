(function () {

  window.onerror = function(msg, url, line) {
  console.error("🔥 JS ERROR:", msg, "at", line);
};

/* ==========================================================================
   CONFIG
========================================================================== */

const BASE_URL = "https://tdc-chatbot-service.netlify.app/chatbot-proxy";
const API_KEY  = "q2FUc9Qt0skumGJ0VCOZMRm8SPuwDhxYX4H6wq2DgftE3D";
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

function startAgentAttention() {
  const agent = qs(".chatbotFigure");

  if (!agent) return;

  agent.classList.add("attentionPulse");

  log("✨ Agent attention ON");
}

function stopAgentAttention() {
  const agent = qs(".chatbotFigure");

  if (!agent) return;

  agent.classList.remove("attentionPulse");

  log("⛔ Agent attention OFF");
}

function triggerAttentionBurst() {

  startAgentAttention();

  setTimeout(() => {
    stopAgentAttention();
  }, 15000);
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

    b.className = `option-btn ${cls}`; //✅ unify class
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
      <span class="chatListIcon">
        ${type === "Event" ? "📅" : "🛒"}
      </span>
      <span>${item.name}</span>
    `;

    el.onclick = () => {

      log(`🖱 ${type} selected:`, item);

      // ✅ Store event if needed
      if (type === "Event") {
        onEventSelected(item);
      }

      renderUserMessage(item.name);

      renderAgentMessage(
        "Jeg skal bruge nogle oplysninger for at kunne hjælpe dig videre. Udfyld venligst formularen herunder."
      );

      /* ✅ ✅ CRITICAL FIX: pass correct type */
      if (type === "Event") {
        renderLeadForm("event");
      } else {
        renderLeadForm("product"); // covers product + knowledge
      }
    };

    wrap.appendChild(el);
  });

  getChatContainer().appendChild(wrap);
  scrollToBottom();
}

function renderLeadForm(type = "event") {
  log("🧾 Rendering lead form:", type);

  const c = getChatContainer();
  if (!c) return;

  const formWrapper = document.createElement("div");
  formWrapper.className = "leadFormWrapper";

  const showExtraFields = type === "knowledge" || type === "product";

  formWrapper.innerHTML = `
    <form id="sfmc_custom_personalized_form" class="mainform" accept-charset="UTF-8">

      <!-- ✅ COMPANY (always shown) -->
      <div class="input-wrapper">
        <div class="search-icon">🔍</div>

        <input type="text" id="company" name="Company" required autocomplete="off"/>
        <label class="floating-label">Virksomhedsnavn eller CVR *</label>

        <div class="spinner" id="spinner"></div>
        <button id="cancelBtn" class="cancel-btn">&times;</button>
        <div id="results"></div>
      </div>

      <div id="statusMessage"></div>

      <!-- ✅ NAME -->
      <div class="floating-group">
        <input type="text" id="name" required placeholder=" "/>
        <label>Navn *</label>
      </div>

      <!-- ✅ PHONE -->
      <div class="floating-group">
        <input type="tel" id="phone" pattern="[0-9]{8}" required placeholder=" "/>
        <label>Telefonnummer *</label>
      </div>

      <!-- ✅ EMAIL -->
      <div class="floating-group">
        <input type="email" id="email" required placeholder=" "/>
        <label>E-mail *</label>
      </div>

      <!-- ✅ EXTRA (only knowledge/product) -->
      ${showExtraFields ? `
        <div class="floating-group">
          <textarea id="comment" placeholder=" "></textarea>
          <label>Kommentar</label>
        </div>

        <div class="inputMainWrapper">
          <label class="checkbox-label">
            <input type="checkbox" id="EmailOptIn" required />
            <span class="checkbox-text">Please check</span>
          </label>
        </div>
      ` : ""}

      <button class="btn-submit" type="submit">
        ${type === "event" ? "Tilmeld event" : "Bliv kontaktet"}
      </button>

      <input type="hidden" id="cvr" name="Cvr">

    </form>
  `;

  c.appendChild(formWrapper);
  scrollToBottom();

  // ✅ only bind autocomplete once
  bindCompanyAutocomplete(formWrapper);

  const form = formWrapper.querySelector("#sfmc_custom_personalized_form");
  const nameInput = formWrapper.querySelector("#name");

  form.addEventListener("submit", (e) => {

    if (!form.checkValidity()) return;

    e.preventDefault();

    const name = nameInput.value.trim();

    if (name) {
      localStorage.setItem(STORAGE_KEYS.CUSTOMER_NAME, name);
    }

    log("✅ Lead form submitted:", type);

    if (type === "event") {
      handleSuccess(selectedEventName, name);
    } else {
      renderAgentMessage(`Tak ${name}, vi kontakter dig hurtigst muligt.`);
    }

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

  
/* ✅ MOBILE: skip overlay completely */
  if (window.innerWidth <= 768) {
    return;
  }

  const overlay = qs("#chatOverlay");
  const content = qs("#overlayContent");

  content.innerHTML = "";

  items.forEach(item => {

    const el = document.createElement("div");

    if (type === "Event") {

      const formattedDate = item.startDate
        ? new Date(item.startDate).toLocaleString("da-DK", {
            day: "2-digit",
            month: "long",
            year: "numeric",
            hour: "2-digit",
            minute: "2-digit"
          })
        : "";

        el.className = "eventCard";

        el.innerHTML = `
          <div class="eventImage">
            ${item.logo ? `<img src="${item.logo}" alt="${item.name}" />` : ""}

            <div class="eventDateBadge">
              ${item.startDate ? new Date(item.startDate).getDate() : ""}
            </div>
          </div>

          <div class="eventContent">

            <h3 class="eventTitle">${item.name}</h3>

            <p class="eventMeta">
              DATO & TIDSPUNKT: ${formattedDate}
            </p>

            <p class="eventLocation">
              LOKATION: ${item.address || item.city || ""}
            </p>

            <p class="eventDescription">
              ${item.description || ""}
            </p>
            
            ${item.expectedAttendees ? `
              <p class="eventAttendees">
                👥 ${item.expectedAttendees} deltagere
              </p>
            ` : ""}
            
            ${item.pageUrl ? `
            <a href="${item.pageUrl}" target="_blank" class="eventLink">
              <button class="eventBtn">Gå til event side</button>
            </a>
          ` : ""}
          </div>
        `;
    }

    content.appendChild(el);
  });

  qs(".chatWrapper").classList.add("overlay-active");
  qs("#chatOverlay").classList.remove("hide");
}

function closeOverlay() {
  qs(".chatWrapper").classList.remove("overlay-active");
  qs("#chatOverlay").classList.add("hide");
}

function bindOverlayClose() {

  qs("#closeOverlayBtn")?.addEventListener("click", () => {

    /* ✅ REMOVE overlay layout */
    qs(".chatWrapper").classList.remove("overlay-active");

    /* ✅ HIDE overlay */
    qs("#chatOverlay").classList.add("hide");

  });
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

  /* =========================================================
     TERMINAL NODE (EVENT / PRODUCT)
  ========================================================= */

  if (data.done && data.response) {

    const r = data.response;
    log("✅ TERMINAL:", r.type);

    // ✅ Render message once
    if (r.message) {
      renderAgentMessage(r.message);
    }

    /* =====================
       EVENT
    ===================== */
    if (r.type === "Event") {
      renderListInChat(r.data || [], "Event");
      openOverlay("Event", r.data || []);
    }

    /* =====================
       PRODUCT
    ===================== */
    if (r.type === "Product") {
      renderListInChat(r.data || [], "Product");
      openOverlay("Product", r.data || []);
    }

    /* ✅ optional followup */
    if (r.followupPrompt) {
      renderAgentMessage(r.followupPrompt);
    }

    return;
  }

  /* =========================================================
     EMPTY OPTIONS (CRITICAL FIX)
  ========================================================= */

  if (Array.isArray(data.options) && data.options.length === 0) {

    const lastChoice = getLastUserMessage() || "dit valg";

    /* ✅ THIS IS THE FIX — do NOT rely on response.type */
    const isEventFlow = !!selectedEventName;

    log("⚠ EMPTY OPTIONS:", lastChoice, "isEventFlow:", isEventFlow);

    /* =====================
       EVENT FLOW
    ===================== */
    if (isEventFlow) {

      renderAgentMessage(
        `Beklager, jeg kunne ikke finde nogen kommende events for "${lastChoice}".`
      );

      renderAgentMessage(
        "Prøv venligst et andet valg, eller vælg en anden kategori."
      );
    }

    /* =====================
       KNOWLEDGE / PRODUCT FLOW
    ===================== */
    else {

      renderAgentMessage(
        `Beklager, jeg kunne ikke finde et svar, der matcher "${lastChoice}, men vi hjælper dig gerne — udfyld formularen nedenfor.`
      );

      /* ✅ Direct fallback → show form */
      renderLeadForm("knowledge");
    }

    return;
  }

  /* =========================================================
     NORMAL FLOW
  ========================================================= */

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
function handleOptionClick(container, clickedBtn, className) {

  container.querySelectorAll(`.${className}`).forEach(btn => {
    btn.classList.remove("active");
    btn.style.pointerEvents = "auto";
  });

  clickedBtn.classList.add("active");
  clickedBtn.style.pointerEvents = "none";
}

function bindRouter() {
  const c = getChatContainer();
  if (!c || c.dataset.bound) return;

  c.dataset.bound = "true";

  c.addEventListener("click", async e => {
    const t = e.target;

    if (t.classList.contains("categoryItem")) {

      selectedEventName = null;

      handleOptionClick(c, t, "categoryItem");

      conversationState.categoryId = t.dataset.id;
      conversationState.topicId = null;
      logState("CATEGORY");

      renderUserMessage(t.textContent);

      handleServerResponse(await fetchChatbot({
        categoryid: conversationState.categoryId
      }));
    }

    if (t.classList.contains("topicItem")) {

      selectedEventName = null;

      handleOptionClick(c, t, "topicItem");

      conversationState.topicId = t.dataset.id;
      logState("TOPIC");

      renderUserMessage(t.textContent);

      handleServerResponse(await fetchChatbot({
        categoryid: conversationState.categoryId,
        topicid: conversationState.topicId
      }));
    }

    if (t.classList.contains("subTopicItem")) {

      selectedEventName = null;

      handleOptionClick(c, t, "subTopicItem");

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
    stopAgentAttention(); 

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
      handleServerResponse(await fetchChatbot());
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

  setTimeout(triggerAttentionBurst, 1000);

  bindAgentClick();
  bindRouter();
  bindOverlayClose();

  qs("#closechatCanvasBtn")?.addEventListener("click", () => {
    qs("#chatCanvas").classList.add("hide");
    closeOverlay();
    showAgentFigurine();
    setTimeout(triggerAttentionBurst, 5000);
  });
}

function control(){}

function reset(){
  qs("#chatbot")?.remove();
}

registerTemplate({ apply, control, reset });

})();
