(function () {

    const campaignType = "Chatbot";
    const apiKey = "00000";
    const baseURL = "https://tdc-support-chatbot.netlify.app/.netlify/functions/getTopics"
    let lastSelectedTopic = "";
    let ongoingChat = false;
    const VIRTUAL_ASSISTANT = assignRandomAssistant();
    console.log("VIRTUAL_ASSISTANT", VIRTUAL_ASSISTANT)

    let DEBUG = true;

    console.log('>*** ' + campaignType + ' initilized ....');
    console.log('>*** Debug mode on: ', DEBUG);

    function buildBindId(context) {
        return `${context.campaign}:${context.experience}`;
    }

    function setDismissal() {
        SalesforceInteractions.cashDom("#closechatCanvasBtn, #closeButton").on("click", () => {
            ongoingChat = true;
            SalesforceInteractions.cashDom("#chatCanvas").addClass("hide");
            SalesforceInteractions.cashDom("#chatbot").removeClass("hide");
        });
    }

    function handleTemplateContent({ context, template }, topics) {
    console.log(topics);
    const html = template(context);
    SalesforceInteractions.cashDom("body").append(html);

    hideElements(
        ".welcomeMessage",
        ".topicsContainer",
        ".chosenTopicContainer",
        ".subTopicsContainer",
        ".chosenSubTopicContainer",
        ".responseContainer",
        ".followupContainer",
    );

    setChatbotBackground(VIRTUAL_ASSISTANT);
    showThankyouPage();
    console.log('>*** ' + campaignType + ' rendering ....');
    if (SalesforceInteractions.cashDom("#chatCanvas").length > 0) {
        SalesforceInteractions.cashDom("#chatCanvas").addClass("hide");
        setDismissal();

        SalesforceInteractions.cashDom("#chatbot .chatbotFigure").on("click", () => {
            SalesforceInteractions.cashDom("#chatbot .chatbotBadge").addClass("hide");
            handleChat(topics)
        });
    }
}


    function handleTriggerEvent({ context, template }) {
        if (SalesforceInteractions.cashDom("#chatbot").length > 0) {
            return;
        } else {
            const stat = {
                experienceId: context.experience,
                stat: "Impression",
                control: true
            };
            SalesforceInteractions.mcis.sendStat({ campaignStats: [stat] });
            if (!context.contentZone) return;
            fetchChatbotData().then(ts => {
                if (ts.topics.length > 0) {
                    const { userGroup, triggerOptions, triggerOptionsNumber } = context || {};
                    switch (triggerOptions.name) {
                        case "timeOnPage":
                            return new Promise((resolve, reject) => {
                                setTimeout(() => {
                                    if (userGroup !== "Control") {
                                        handleTemplateContent({ context, template }, ts.topics);
                                    }
                                    resolve(true);
                                }, triggerOptionsNumber);
                            });
                    }
                }
            });
        }
    };

    function apply(context, template) {
        logValue('>*** APPLY: User in Campaign control', context.userGroup);
        if (SalesforceInteractions.cashDom("#chatbox").length > 0) return;
        return handleTriggerEvent({ context, template });
    }

    function reset(context, template) {
        SalesforceInteractions.DisplayUtils.unbind(buildBindId(context));
        SalesforceInteractions.cashDom(`[data-evg-campaign-id="${context.campaign}"][data-evg-experience-id="${context.experience}"]`)
            .remove();
    }

    function control(context) {
        logValue('>*** CONTROL: User in Campaign control', context.userGroup);
        return handleTriggerEvent({ context });
    }

    registerTemplate({
        apply: apply,
        reset: reset,
        control: control
    });


    function logValue(label, value) {
        if (DEBUG) {
            console.log(`${label}: `, value);
        }
    };

    function debounce(fn, delay = 400) {
        let timeout;
        return (...args) => {
            clearTimeout(timeout);
            timeout = setTimeout(() => fn(...args), delay);
        };
    }

    async function fetchChatbotData({ topic = null, subtopic = null } = {}) {
        const CACHE_KEY = "chatbot_all_topics";
        const CACHE_TTL = 1000 * 60 * 60 * 24 * 30; // 1 month
        console.log("topic: ", topic)
        console.log("subtopic: ", subtopic)
        if (!topic && !subtopic) {
            const cached = localStorage.getItem(CACHE_KEY);
            if (cached) {
                const parsed = JSON.parse(cached);
                if (Date.now() - parsed.timestamp < CACHE_TTL) {
                    console.log("Loaded topics from localStorage");
                    return parsed.data;
                }
            }
        }
        let url = `${baseURL}?apikey=${apiKey}`;
        if (topic) url += `&topic=${topic}`;
        if (subtopic) url += `&subtopic=${subtopic}`;

        console.log("url: ", url)

        try {
            const response = await fetch(url, {
                method: "GET",
                headers: { "Content-Type": "application/json" }
            });

            if (!response.ok) {
                throw new Error(`Request failed with status ${response.status}`);
            }

            const data = await response.json();

            if (!topic && !subtopic) {
                localStorage.setItem(
                    CACHE_KEY,
                    JSON.stringify({ timestamp: Date.now(), data })
                );
            }
            return data;
        } catch (err) {
            console.error("Error fetching chatbot data:", err);
            return null;
        }
    }

    function handleChat(topics) {
    const chatCanvas = document.querySelector("#chatCanvas");
    showElements("#chatCanvas");

    const welcomeMessage = document.querySelector(".welcomeMessage");
    const topicsContainer = document.querySelector(".topicsContainer");

    welcomeMessage.innerHTML = `
        <div class="bouncingDots"><div></div><div></div><div></div></div>
    `;
    showElements(".welcomeMessage");
    
    setTimeout(() => {
        const assistant = VIRTUAL_ASSISTANT;
        welcomeMessage.innerHTML = `
            <div class="messageWrapper">
                <div class="chatbotAvatar"></div>
                <p>${assistant.message}</p>
            </div>
        `;

         setChatbotBackground(assistant);

        topicsContainer.innerHTML = `
            <div class="bouncingDots"><div></div><div></div><div></div></div>
        `;
        showElements(".topicsContainer");

        setTimeout(() => {
            load(topics, "topicItem");
            selectTopic();
            selectSubTopic();
        }, 1200);
    }, 1200);
}



    function hideElements(...selectors) {
        selectors.forEach(sel => {
            const el = document.querySelector(sel);
            if (el && !el.classList.contains("hide")) {
                el.classList.add("hide");
            }
        });
    }

    function showElements(...selectors) {
        selectors.forEach(sel => {
            const el = document.querySelector(sel);
            if (el && el.classList.contains("hide")) {
                el.classList.remove("hide");
            }
        });
    }

    function selectTopic() {
        const topicsContainer = document.querySelector(".topicsContainer");
        const chosenTopicContainer = document.querySelector(".chosenTopicContainer");
        const subTopicsContainer = document.querySelector(".subTopicsContainer");
        const contactForm = document.querySelector(".contactForm");

        let lastChosen = null;

        topicsContainer.addEventListener("click", debounce((e) => {

            if (!e.target.classList.contains("topicItem")) return;

            hideElements(
                ".responseContainer",
                ".subTopicsContainer",
                ".chosenSubTopicContainer",
                ".chosenSubTopicItem",
                ".followupContainer"
            );
            showElements(".chosenTopicContainer");

            const clicked = e.target;
            const item = clicked.textContent.trim();
            console.log("selectedTopic: ", item)
            lastSelectedTopic = item;
            console.log("lastSelectedTopic in selectTopic: ", lastSelectedTopic);

            if (lastChosen) lastChosen.classList.remove("disabled");
            clicked.classList.add("disabled");
            lastChosen = clicked;

            const isAdvisorRequest = item.toLowerCase() === "tale med en professionel rådgiver";

            chosenTopicContainer.innerHTML = `
                <div class="messageWrapper">
                    <div class="chatbotAvatar"></div>
                    <p>
                        Tak for dit valg. Nedenfor finder du de underemner, der passer til det område, du har valgt.
                    </p>
                </div>
            `;

            chosenTopicContainer.innerHTML = isAdvisorRequest
                ? `
                <div class="messageWrapper">
                    <div class="chatbotAvatar"></div>
                        <p>For at vi kan hjælpe dig bedre og hurtigere, bedes du udfylde den korte formular nedenfor, så vender vi tilbage til dig snarest.</p>
                    </div>
                </div>`
                : `

                <div class="messageWrapper">
                    <div class="chatbotAvatar"></div>
                        <p>Tak for dit valg. Nedenfor finder du de underemner, der passer til det område, du har valgt.</p>
                        </div>
                </div>`;

            setChatbotBackground(VIRTUAL_ASSISTANT);
            showElements(".subTopicsContainer");
            console.log("isAdvisorRequest: ", isAdvisorRequest)
            if (isAdvisorRequest) {
                subTopicsContainer.innerHTML = "";
                hideElements(
                    ".responseContainer",
                    ".chosenSubTopicContainer",
                    ".followupContainer"
                );

                subTopicsContainer.appendChild(contactForm);

                //subTopicsContainer.innerHTML = contactForm.innerHTML;

                /* setTimeout(() => {
                     showElements(".contactForm");
                 }, 2000);
                 */

            } else {

                subTopicsContainer.innerHTML = `
                <div class="bouncingDots"><div></div><div></div><div></div></div>
            `;
                fetchChatbotData({ topic: item, subtopic: null }).then(data => {
                    console.log("Subtopics: ", data)
                    subTopicsContainer.innerHTML = "";

                    if (!data?.subtopics?.length) {
                        subTopicsContainer.innerHTML =
                        `<div class="messageWrapper">
                            <div class="chatbotAvatar"></div>
                            <p>
                            Jeg kunne desværre ikke finde nogen underemner til dette valg, men du er ikke gået i stå. Udfyld blot formularen, så vender en af mine kolleger tilbage til dig hurtigst muligt.</div>";
                            </p>
                        </div>`   
                        return;
                        
                    }
                    setChatbotBackground(VIRTUAL_ASSISTANT);
                    load(data.subtopics, "subTopicItem");
                });
            }

        }, 400));
    }


    function selectSubTopic() {
        console.log("lastSelectedTopic in selectSubTopic: ", lastSelectedTopic);
        const subTopicsContainer = document.querySelector(".subTopicsContainer");
        let lastChosen = null;


        subTopicsContainer.addEventListener("click", debounce((e) => {

            if (!e.target.classList.contains("subTopicItem")) return;

            hideElements(
                ".chosenSubTopicContainer",
                ".responseContainer",
                ".followupContainer"
            );

            const clicked = e.target;
            const item = clicked.textContent;
            console.log("selectedSubtopicTopic: ", item)

            if (lastChosen) lastChosen.classList.remove("disabled");
            clicked.classList.add("disabled");
            lastChosen = clicked;


            const chosenSubTopicContainer = document.querySelector(".chosenSubTopicContainer");
            chosenSubTopicContainer.innerHTML =
                `<div class="messageWrapper">
                    <div class="chatbotAvatar"></div> 
                    <p>Her er de oplysninger, jeg har samlet til dig på baggrund af din forespørgsel.</p>
                </div>`;

            setChatbotBackground(VIRTUAL_ASSISTANT);

            const responseContainer = document.querySelector(".responseContainer");
            const followupContainer = document.querySelector(".followupContainer");
            const formHeaderContainer = document.querySelector(".formHeaderContianer");

            showElements(".responseContainer", ".formHeaderContianer");

            responseContainer.innerHTML = `
                <div class="bouncingDots"><div></div><div></div><div></div></div>
            `;

            fetchChatbotData({ topic: lastSelectedTopic, subtopic: item }).then(data => {
                console.log("Response: ", data)
                responseContainer.innerHTML = "";


                const response = data.response

                responseContainer.innerHTML = `
                <div class="messageWrapper">
                    <div class="chatbotAvatar"></div> 
                    <p>${response}</p>` ||
                    "Der blev desværre ikke fundet et svar. Udfyld venligst formularen, så vender en af mine kolleger tilbage til dig hurtigst muligt."
                `</div>`;

                setChatbotBackground(VIRTUAL_ASSISTANT);

                const headertext = data.headertext
                formHeaderContainer.innerHTML = `<p class="headerText">${headertext}</p>` ||
                    "We will coming back to you shortly";

                if (!data?.headertext) {
                    formHeaderContainer.innerHTML = `<p class="headerText">Lad os vide, hvordan vi kan hjælpe.</p>`;
                }

                if (data?.response) {
                    setTimeout(() => {

                        showElements(".followupContainer");

                        followupContainer.innerHTML = `
                        <div class="messageWrapper">
                            <div class="chatbotAvatar"></div> 
                        </div>`;

                        setChatbotBackground(VIRTUAL_ASSISTANT);

                        const followUpDiv = document.createElement("div");
                        followUpDiv.className = "follow-up";

                        const question = document.createElement("p");
                        question.textContent = "Lad vores kollega vende tilbage til dig så hurtigt som muligt.";

                        const connectBtn = document.createElement("button");
                        connectBtn.textContent = "Klik her";
                        connectBtn.className = "chat-options";

                        followUpDiv.append(question, connectBtn);
                        followupContainer.appendChild(followUpDiv);

                        connectBtn.onclick = () => {
                            const sectionsToHide = [
                                "welcomeMessage",
                                "topicsContainer",
                                "chosenTopicContainer",
                                "subTopicsContainer",
                                "chosenSubTopicContainer",
                                "responseContainer",
                                "followupContainer"
                            ];

                            sectionsToHide.forEach(className => {
                                const element = document.querySelector(`.${className}`);
                                if (element) {
                                    element.style.display = "none";
                                }
                            });

                            const chatbotForm = document.getElementById("chatbot-form");
                            chatbotForm.style.display = "flex";
                        };

                        followupContainer.appendChild(followUpDiv);
                        followUpDiv.append(question, connectBtn);

                        const cancelButton = document.getElementById("cancelButton");

                        cancelButton.onclick = () => {
                            const chatbotForm = document.getElementById("chatbot-form");
                            chatbotForm.style.display = "none";

                            const sectionsToShow = [
                                "welcomeMessage",
                                "topicsContainer",
                                "chosenTopicContainer",
                                "subTopicsContainer",
                                "chosenSubTopicContainer",
                                "responseContainer",
                                "followupContainer"
                            ];

                            sectionsToShow.forEach(className => {
                                const element = document.querySelector(`.${className}`);
                                if (element) {
                                    element.style.display = "flex";
                                }
                            });
                        };
                        return;
                    }, 2000)
                }
            });
        }, 400));
    }

    function load(topics, item) {
        const selectorMap = {
            topicItem: ".topicsContainer",
            subTopicItem: ".subTopicsContainer"
        };
        const container = document.querySelector(selectorMap[item]);
        console.log("container to be loaded: ", container)
        container.innerHTML = "";
        topics.forEach(topic => {
            const div = document.createElement("div");
            div.className = item;
            div.textContent = topic;
            if (selectorMap[item] == "topicItem" && topic === "Tale med en professionel rådgiver") {
                div.style.fontWeight = "bolder";
            }
            container.appendChild(div);
        });
    }

    function assignRandomAssistant() {
        const profiles = [
            {
                id: 1,
                name: "David",
                image: 'https://image.email.tdc.dk/lib/fe2c11737364047b751c77/m/1/9eaac0b4-553d-411f-801f-c25b08ae6b94.jpg'
            },
            {
                id: 2,
                name: "Mathilde",
                image: 'https://image.email.tdc.dk/lib/fe2c11737364047b751c77/m/1/6964161f-727b-45fd-8c07-3e62dff7867b.jpg'
            },
            {
                id: 3,
                name: "Andreas",
                image: 'https://image.email.tdc.dk/lib/fe2c11737364047b751c77/m/1/a111022c-6a50-4c4a-b7da-6a59f4e79ff8.jpg'
            },
            {
                id: 4,
                name: "Mira",
                image: 'https://image.email.tdc.dk/lib/fe2c11737364047b751c77/m/1/b0b8d809-6e66-4e5b-8ce2-3bb4ad1a9c91.jpg'
            },
            {
                id: 5,
                name: "Alma",
                image: 'https://i.imgur.com/Whlk887.png'
            }
        ];
        var randomProfile = profiles[Math.floor(Math.random() * profiles.length)];
        return {
            profile: randomProfile,
            message: `Hej! Jeg er ${randomProfile.name}, din virtuelle assistent. Jeg er her for at gøre det hele lidt lettere for dig. Tag et kig på mulighederne nedenfor – og hvis ingen af dem passer til det, du søger, kan du vælge muligheden for at tale med en professionel rådgiver og få gratis rådgivning fra en af mine kolleger.`
        };
    }

    function setChatbotWelcomeMessage(assistant) {
    const welcomeMessage = document.querySelector('#chatContainer .welcomeMessage');
    if (!welcomeMessage) return;

    showElements(".welcomeMessage");
    
    welcomeMessage.innerHTML = `
        <div class="bouncingDots"><div></div><div></div><div></div></div>
    `;
    
    setTimeout(() => {
        welcomeMessage.innerHTML = `
        <div class="messageWrapper">
            <div class="chatbotAvatar"></div> 
            <p>${assistant.message || "Hej! Jeg er din virtuelle assistent og jeg er her for at gøre det hele lidt lettere for dig..."}</p>
        </div>`;
        setChatbotBackground(VIRTUAL_ASSISTANT);
    }, 1200);
}



    function setChatbotBackground(assistant) {
    const fallbackImage = "https://image.email.tdc.dk/lib/fe2c11737364047b751c77/m/1/6964161f-727b-45fd-8c07-3e62dff7867b.jpg";
    
    const img = new Image();
    img.onload = function () {
        const figure = document.querySelector('#chatbot .chatbotFigure');
        if (figure) {
            figure.style.backgroundImage = `url("${assistant.profile.image}")`;
        }

        const avatars = document.querySelectorAll('.chatbotAvatar');
        avatars.forEach(avatar => {
            avatar.style.backgroundImage = `url("${assistant.profile.image}")`;
        });
    };
    img.onerror = function () {
        const figure = document.querySelector('#chatbot .chatbotFigure');
        if (figure) {
            figure.style.backgroundImage = `url("${fallbackImage}")`;
        }
        const avatars = document.querySelectorAll('.chatbotAvatar');
        avatars.forEach(avatar => {
            avatar.style.backgroundImage = `url("${fallbackImage}")`;
        });
    };
    img.src = assistant.profile.image;

}

function showThankyouPage() {
    const submitBtns = [
        document.getElementById("beContacted"),
        document.getElementById("sendButton")
    ].filter(Boolean);


    const sectionsToHide = [
        "welcomeMessage",
        "topicsContainer",
        "chosenTopicContainer",
        "subTopicsContainer",
        "chosenSubTopicContainer",
        "responseContainer",
        "followupContainer",
        "formContainer"
    ];

    submitBtns.forEach(submitBtn => {
        submitBtn.addEventListener("click", debounce(() => {
            sectionsToHide.forEach(className => {
                const element = document.querySelector(`.${className}`);
                if (element) element.classList.add("hide");
            });

            const thankYou = document.querySelector(".thankYouContainer");
            if (thankYou) thankYou.style.display = "flex";
        }, 400));
    });
}





})();

