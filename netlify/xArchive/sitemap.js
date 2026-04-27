const ENV_CONFIG = {
    env: "dev"
    ,blackoutPeriod: 30
}

console.log('>*** ENVIRONMENT --> ', ENV_CONFIG.env);
console.log('>*** Cookie Id collection enabled --> ');


const cookieIdSitemap = getCookieSiteMap("nQ_cookieId");
logValue("cookieIdSitemap Id:", cookieIdSitemap);



/******************  Execution area ****************** */

executeSiteMap();
window.addEventListener("popstate", () => {
    const currentURL = window.location.href;
    const currentURLisSection = currentURL.includes("#"); //Redirect to section
    if(!currentURLisSection){
        if (SalesforceInteractions && typeof SalesforceInteractions.reinit === "function") {
          SalesforceInteractions.reinit();
            console.log('>*** SalesforceInteractions reinitialized ...');
        }
        executeSiteMap();
    }
});

/*******************************/



function executeSiteMap(){

    getBrowseSource(window.location.href); //set browser source (Email/Facebook/LinkedIn)

    const currentUrlPath = window.location.pathname == "/" ? "home" : window.location.pathname;

    let viewedInteraction = window.location.pathname == "/" ? "home"+window.location.search : window.location.pathname+window.location.search;

    let pathAndParams = window.location.hostname === "cloud.email.tdc.dk" ? window.location.href.replace(/^https?:\/\//, "") : truncateString(viewedInteraction);

    const pageName = currentUrlPath.replace(/\//g, " ").trim();

    const cloudpagesForm = document.getElementById("smartcapture-form-main");
    console.log("Cloud pages Form object", cloudpagesForm)
    if(cloudpagesForm){
        console.log("In sfmc cloud pages")
        cloudpagesForm.addEventListener('submit', (e) => {
            e.preventDefault(); //Prevents the default form submission
            const formSubmitInteraction = "Submitted "+pageName+" form";
            logValue('>*** FormSubmitInteraction', formSubmitInteraction);
            const data =  submittedInputs();
            const name = data.FirstName+" "+data.LastName
            console.log("submitted cloudpage form data: ",data)
            try{
                /*SalesforceInteractions.sendEvent({
                    interaction: { name: formSubmitInteraction+'_CLOUDPAGES' },
                    user: { 
                        identities: {
                            navn: name
                            ,emailAddress: data.Email
                            ,company: data.Company
                            ,phone: data.Phone
                            ,cvr: data.Cvr
                            ,jobTitle: data.JobTitle
                            ,comment: data.comment
                            ,sourcePage: window.location.href
                        } 
                    },
                });*/
                logValue(">*** Form submitted successfully", {
                    interaction: { name: formSubmitInteraction+'_CLOUDPAGES' },
                    user: { 
                        identities: {
                            navn: name
                            ,emailAddress: data.Email
                            ,company: data.Company
                            ,phone: data.Phone
                            ,cvr: data.Cvr
                            ,jobTitle: data.JobTitle
                            ,comment: data.comment
                            ,sourcePage: window.location.href
                        } 
                    },
                });

                
                //console.log("Reloading...")
               // window.location.href = "https://cloud.email.tdc.dk/Custom_Lead_Form_Template_rmo"
               

                //setSessionItemWithExpiry('sfmc_personalization_Campaign_session_blackout', true, hours = 12);
                //addSubmittedFormToStorage('formSubmitInteraction', formSubmitInteraction , ENV_CONFIG.blackoutPeriod);
            }catch(e){
                logValue('>*** Cloudpage submit error',e)
            }
        });
    }

    if (allConsentGranted()) {
        logValue('>*** AllConsentGranted',allConsentGranted());

        document.addEventListener('submit', (event) => {
            event.preventDefault(); //Prevents the default form submission
            const form = event.target;
            if (form.tagName.toLowerCase() == 'form' && form.id != 'sfmc_custom_personalized_form' && form.id != "b6t22b02f69") {

                const submittedParams =  submittedInputs();

                if(form.id == "smartcapture-form-main"){
                    logValue('>*** A Cloudpages form was submitted', submittedParams);
                }else{
                    console.log('>*** A Contentful form was submitted', submittedParams);                

                    const submittedParams = getSubmittedParams(form)
                    const formSubmitInteraction = "Submitted "+pageName+" form";
                    if(submittedParams.email && submittedParams.tel && submittedParams.userName && submittedParams.company && submittedParams.optIn){
                        logValue('>*** FormSubmitInteraction',formSubmitInteraction+'_CONTENTFUL');
                        SalesforceInteractions.sendEvent({
                            interaction: { name: formSubmitInteraction+'_CONTENTFUL' },
                            user: { 
                                identities: {
                                    navn: submittedParams.userName
                                    ,emailAddress: submittedParams.email
                                    ,company: submittedParams.company
                                    ,phone: submittedParams.tel
                                    ,optedIn: submittedParams.optIn ? 'OPT-IN' : 'OPT-OUT'
                                } 
                            },
                        });
                        addSubmittedFormToStorage('formSubmitInteraction', formSubmitInteraction , ENV_CONFIG.blackoutPeriod );
                    }
                }
            }
        });
        

        SalesforceInteractions.init({
            cookieDomain: "tdcdk-staging.netlify.app"
            ,consents: [{
                purpose: SalesforceInteractions.mcis.ConsentPurpose.Personalization,
                provider: "Consent Manager",
                status: SalesforceInteractions.ConsentStatus.OptIn
            }]
        }).then(() => {            
            SalesforceInteractions.initSitemap({
                global: {
                    contentZones: [
                        { name: ENV_CONFIG.env+"_Staging_Global_ExitIntent_Popup" }
                        ,{ name: ENV_CONFIG.env+"_Staging_Global_TimeOnPage_Popup" }
                        ,{ name: "Staging_Global_TimeOnPage_sliding" }
                    ],
                },
                pageTypeDefault: {
                     name: "Dynamic",
                    interaction: {
                        name: "Viewed "+pathAndParams,
                    }
                },
                pageTypes: [
                ],             
            });
        })
    }
};

/********************************** Helper functions ***********************************************/

(function(history){
  const pushState = history.pushState;
  history.pushState = function(state) {
    const result = pushState.apply(history, arguments);
    window.dispatchEvent(new Event('popstate'));
    return result;
  };
})(window.history);

function getLatestConsentState() {
  const dl = window.dataLayer || [];
  for (let i = dl.length - 1; i >= 0; i--) {
    const cmd = dl[i];
    if (cmd[0] === 'consent' && cmd[1] === 'update' && typeof cmd[2] === 'object') {
      return cmd[2];      
    }
  }
  return null;
}

function allConsentGranted() {
  const state = getLatestConsentState();
  if (!state) return false;
  return Object.values(state).every(v => v === 'granted');
}

function submittedInputs(){
    const formData = {};
    const inputs = document.querySelectorAll("input, select, textarea");

    inputs.forEach(input => {
      formData[input.name] = input.value;
    });
    return formData;
}

function getSubmittedParams(formInputs) {
    let tel = null,
        email = null,
        company = null,
        userName = null,
        optIn = null;

    Array.from(formInputs).forEach(input => {
        if (!input || !input.value) return;

        const { id = "", type = "", role = "", value } = input;
        const lowerId = id.toLowerCase();

        if (id === "email" || type === "email") {
            email = value;
        } else if (type === "tel") {
            tel = value;
        } else if (type === "checkbox") {
            optIn = input.checked ? value : null; // safer: only if checked
        } else if (role === "combobox") {
            company = value;
        } else if (["name", "navn", "efternavn"].includes(lowerId)) {
            userName = value;
        }
    });

    return { userName, email, tel, company, optIn };
};

function setSessionItemWithExpiry(key, value, hours = 12) {
    const now = new Date().getTime();
    const expiryTime = now + hours * 60 * 60 * 1000; // hours → ms
    const item = {
        value,
        expiry: expiryTime
    };
    sessionStorage.setItem(key, JSON.stringify(item));
}

function getSessionItemWithExpiry(key) {
    const itemStr = sessionStorage.getItem(key);
    if (!itemStr) return null;

    try {
        const item = JSON.parse(itemStr);
        const now = new Date().getTime();

        if (now > item.expiry) {
            // Expired → remove it
            sessionStorage.removeItem(key);
            return null;
        }
        return item.value;
    } catch (e) {
        // If parsing fails, clear it
        sessionStorage.removeItem(key);
        return null;
    }
}

function addSubmittedFormToStorage(key, value, blackoutPeriod) {
    const items = JSON.parse(localStorage.getItem(key)) || []
    items.push({
        value: value,
        expiry: new Date().getTime() + blackoutPeriod * 24 * 60 * 60 * 1000
    });
    localStorage.setItem(key, JSON.stringify(items));
}

function getBrowseSource(url) {
    console.log('getBrowseSource')
    const currentURLLowercased = url.toLowerCase();
    const sources = ["email", "facebook", "linkedin", "google", "sms", "whatsapp"];
    let matchedSource = sources.find(src =>
        currentURLLowercased.includes(`:${src}`) || currentURLLowercased.includes(`=${src}`)
    );
    const browseSource = matchedSource
        ? `User browser source is ${matchedSource}`
        : "User browser source is unknown";

    // Extract omnichannel_id parameter
    //const omniChannelId = url.searchParams.get('omnichannel_id');
    const match = window.location.href.match(/omnichannel_id=([a-f0-9]+)/i);
    const omniChannelId = match ? match[1] : null;

    console.log("SFMC ID:", omniChannelId);

    setTimeout(() => {
        SalesforceInteractions.sendEvent({
            interaction: { name: browseSource },
            user: {
                attributes: {
                    omniChannelId: omniChannelId ? omniChannelId : ''
                },
            },
        });
        logValue(">*** browse Source", browseSource);
    }, 2000);
}

function truncateString(str) {
  return str.length > 200 ? str.slice(0, 200) : str;
}

function logValue(label, value) {
    if (ENV_CONFIG.env == 'dev') {
        console.log(`${label}: `, value);
    }
};

function getCookieSiteMap(name) {
    console.log('Get cookie Id function')
    const value = `; ${document.cookie}`;
    const parts = value.split(`; ${name}=`);
    if (parts.length === 2) return parts.pop().split(';').shift();        
}