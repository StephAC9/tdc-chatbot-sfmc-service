
<script runat="server">
Platform.Load("Core", "1.1.1");

/* =========================
   HELPERS
========================= */
function checkApiKey(key, expected) {
    if (!key || !expected) return false;
    return key === expected;
}

/* =========================
   TREE LOOKUPS
========================= */
function getCategories() {
  try {
    var rows = DataExtension.Init("Categories").Rows.Lookup("IsActive", "true");
    var out = [];
    if (!rows) return out;
    for (var i = 0; i < rows.length; i++) {
      out.push({ id: rows[i].CategoryId, label: rows[i].CategoryName });
    }
    return out;
  } catch(e){ return []; }
}

function getTopics(categoryId) {
  try {
    var rows = DataExtension.Init("Topics")
      .Rows.Lookup(["CategoryId","IsActive"], [categoryId,"true"]);
    var out = [];
    if (!rows) return out;
    for (var i = 0; i < rows.length; i++) {
      out.push({ id: rows[i].TopicId, label: rows[i].Topic });
    }
    return out;
  } catch(e){ return []; }
}

function getSubtopics(topicId) {
  try {
    var rows = DataExtension.Init("SubTopics")
      .Rows.Lookup(["TopicId","IsActive"], [topicId,"true"]);
    var out = [];
    if (!rows) return out;
    for (var i = 0; i < rows.length; i++) {
      out.push({ id: rows[i].SubTopicId, label: rows[i].SubTopic });
    }
    return out;
  } catch(e){ return []; }
}

function getTopic(topicId) {
  try {
    var rows = DataExtension.Init("Topics").Rows.Lookup("TopicId", topicId);
    return rows && rows.length ? rows[0] : null;
  } catch(e){ return null; }
}

function getSubtopic(subtopicId) {
  try {
    var rows = DataExtension.Init("SubTopics").Rows.Lookup("SubTopicId", subtopicId);
    return rows && rows.length ? rows[0] : null;
  } catch(e){ return null; }
}

/* =========================
   RESPONSE RESOLVER
   - Knowledge: single text
   - Event: list
   - Product: list
========================= */
function getResponse(requestId, responseType, deKey) {
  try {
    if (!requestId || !responseType || !deKey) return null;

    // Use External Key
    var rows = Platform.Function.LookupRows(
      deKey,
      ["RequestId"],
      [requestId]
    );
    if (!rows || rows.length === 0) return null;

    // Knowledge → single
    if (responseType === "Knowledge") {
      var r0 = rows[0];
      return {
        type: "Knowledge",
        message: r0.Response || null,
        followupPrompt: r0.FollowupPrompt ||
          "Har du brug for mere information eller direkte hjælp? Udfyld formularen herunder, så kontakter en rådgiver dig hurtigst muligt."
      };
    }

    // Event → list
    if (responseType === "Event") {

        var events = [];
        var now = new Date(); // ✅ SFMC server time

        for (var i = 0; i < rows.length; i++) {

            var startDate = rows[i].StartDate ? new Date(rows[i].StartDate) : null;
            var endDate   = rows[i].EndDate   ? new Date(rows[i].EndDate)   : null;

            // ✅ Filter: upcoming OR ongoing events only
            var isUpcoming =
                (endDate && endDate >= now) ||
                (!endDate && startDate && startDate >= now);

            if (!isUpcoming) {
                continue; // ❌ skip past events
            }

            events.push({
                eventId: rows[i].EventId || null,
                name: rows[i].Name || null,
                startDate: rows[i].StartDate || null,
                endDate: rows[i].EndDate || null,
                city: rows[i].City || null,
                address: rows[i].Address || null,
                description: rows[i].Description || null,
                pageUrl: rows[i].PageURL || null
            });
        }

        // ✅ If no upcoming events left
        if (events.length === 0) {
            return null;
        }

        return {
            type: "Event",
            message: "Her er de kommende events, der matcher dit valg.",
            followupPrompt: rows[0].FollowupPrompt ||
              "Vil du gerne tilmeldes et af disse events? Udfyld formularen herunder, så hjælper vi dig videre.",
            data: events
        };
    }

    // Product → list
    if (responseType === "Product") {
      var products = [];
      for (var j = 0; j < rows.length; j++) {
        products.push({
          productId: rows[j].ProductId || null,
          name: rows[j].Name || null,
          description: rows[j].Description || null,
          subscriptionType: rows[j].SubscriptionType || null,
          price: rows[j].Price || null
        });
      }
      return {
        type: "Product",
        message: "Her er de produkter, der matcher dit valg.",
        followupPrompt: rows[0].FollowupPrompt ||
          "Har du brug for hjælp til at vælge det rette produkt til jeres virksomhed? Udfyld formularen herunder, så kontakter en rådgiver dig.",
        data: products
      };
    }

    return null;
  } catch(e){ return null; }
}

/* =========================
   CONFIG & INPUT
========================= */
var API_KEY = Platform.Function.Lookup(
  "ChatBotServiceConfig",
  "API_KEY",
  "LookupVal",
  1
);

var apiKey     = Request.GetQueryStringParameter("apikey");
var categoryId = Request.GetQueryStringParameter("categoryid");
var topicId    = Request.GetQueryStringParameter("topicid");
// accept both param names (defensive)
var subtopicId = Request.GetQueryStringParameter("subtopicid")
               || Request.GetQueryStringParameter("subtopic");

if (!checkApiKey(apiKey, API_KEY)) {
  Platform.Response.Write(Stringify({ error: "Invalid API key" }));
  return;
}

/* =========================
   RESPONSE MODEL
========================= */
var result = {
  state: {
    categoryId: categoryId || null,
    topicId: topicId || null,
    subtopicId: subtopicId || null
  },
  prompt: "",
  options: [],
  response: null,
  done: false
};

/* =========================
   CONVERSATION FLOW
========================= */
if (!categoryId) {
  result.prompt = "Hvad vil du gerne vide mere om?";
  result.options = getCategories();
}
else if (categoryId && !topicId) {
  result.prompt = "Vælg et emne:";
  result.options = getTopics(categoryId);
}
else if (topicId && !subtopicId) {

  var topic = getTopic(topicId);

  if (!topic) {
    result.response = {
      status: "Error",
      statusCode: 404,
      type: "NotFound",
      message: "Beklager, jeg kunne ikke finde et svar, der matcher din forespørgsel lige nu.",
      followupPrompt: "Udfyld venligst formularen herunder, hvis du ønsker at blive kontaktet direkte.",
      data: null
    };
    result.prompt = "";
    result.done = true;
  }
  else if (topic.IsTerminalNode == true) {

    var r = getResponse(topicId, topic.ResponseType, topic.ResponseDeKey);

    if (r) {
      result.response = {
        status: "OK",
        statusCode: 200,
        type: r.type,
        message: r.message,
        followupPrompt: r.followupPrompt || null,
        data: r.data || null
      };

      if (r.type === "Knowledge") result.prompt = "Her er det, jeg fandt til dig";
      else if (r.type === "Event") result.prompt = "Her er vores kommende arrangementer";
      else if (r.type === "Product") result.prompt = "Her er vores produkter, som matcher dit behov";
      else result.prompt = "Her er det, jeg fandt til dig";

    } else {
      result.response = {
        status: "Error",
        statusCode: 404,
        type: "NotFound",
        message: "Beklager, jeg kunne ikke finde et svar, der matcher din forespørgsel lige nu.",
        followupPrompt: "Udfyld venligst formularen herunder, hvis du ønsker at blive kontaktet direkte.",
        data: null
      };
      result.prompt = "";
    }

    result.done = true;
  }
  else {
    result.prompt = "Vælg en underkategori:";
    result.options = getSubtopics(topicId);
  }
}
else if (subtopicId) {

  var subtopic = getSubtopic(subtopicId);

  if (!subtopic) {
    result.response = {
      status: "Error",
      statusCode: 404,
      type: "NotFound",
      message: "Beklager, jeg kunne ikke finde et svar, der matcher din forespørgsel lige nu.",
      followupPrompt: "Udfyld venligst formularen herunder, hvis du ønsker at blive kontaktet direkte.",
      data: null
    };
    result.prompt = "";
    result.done = true;
  }
  else {

    var r2 = getResponse(subtopicId, subtopic.ResponseType, subtopic.ResponseDeKey);

    if (r2) {
      result.response = {
        status: "OK",
        statusCode: 200,
        type: r2.type,
        message: r2.message,
        followupPrompt: r2.followupPrompt || null,
        data: r2.data || null
      };

      if (r2.type === "Knowledge") result.prompt = "Her er det, jeg fandt til dig";
      else if (r2.type === "Event") result.prompt = "Her er vores kommende arrangementer";
      else if (r2.type === "Product") result.prompt = "Her er vores produkter, som matcher dit behov";
      else result.prompt = "Her er det, jeg fandt til dig";

    } else {
      result.response = {
        status: "Error",
        statusCode: 404,
        type: "NotFound",
        message: "Beklager, jeg kunne ikke finde et svar, der matcher din forespørgsel lige nu.",
        followupPrompt: "Udfyld venligst formularen herunder, hvis du ønsker at blive kontaktet direkte.",
        data: null
      };
      result.prompt = "";
    }

    result.done = true;
  }
}
  

/* =========================
   OUTPUT
========================= */
Platform.Response.Write(Stringify(result));
  
</script>

<!--<script runat="server">
Platform.Load("Core", "1.1.1");

function checkApiKey(key, expected) {
    if (!key || !expected) return false;
    return key === expected;
}

function getCategories() {
    try {
        var rows = DataExtension.Init("Categories")
            .Rows.Lookup("IsActive", "true");
        var out = [];
        if (!rows) return out;
        for (var i = 0; i < rows.length; i++) {
            out.push({
                id: rows[i].CategoryId,
                label: rows[i].CategoryName
            });
        }
        return out;
    } catch (e) {
        return [];
    }
}

function getTopics(categoryId) {
    try {
        var rows = DataExtension.Init("Topics")
            .Rows.Lookup(["CategoryId", "IsActive"], [categoryId, "true"]);
        var out = [];
        if (!rows) return out;
        for (var i = 0; i < rows.length; i++) {
            out.push({
                id: rows[i].TopicId,
                label: rows[i].Topic
            });
        }
        return out;
    } catch (e) {
        return [];
    }
}

function getSubtopics(topicId) {
    try {
        var rows = DataExtension.Init("SubTopics")
            .Rows.Lookup(["TopicId", "IsActive"], [topicId, "true"]);
        var out = [];
        if (!rows) return out;
        for (var i = 0; i < rows.length; i++) {
            out.push({
                id: rows[i].SubTopicId,
                label: rows[i].SubTopic
            });
        }
        return out;
    } catch (e) {
        return [];
    }
}

function getTopic(topicId) {
    try {
        var rows = DataExtension.Init("Topics")
            .Rows.Lookup("TopicId", topicId);
        return rows && rows.length > 0 ? rows[0] : null;
    } catch (e) {
        return null;
    }
}

function getSubtopic(subtopicId) {
    try {
        var rows = DataExtension.Init("SubTopics")
            .Rows.Lookup("SubTopicId", subtopicId);
        return rows && rows.length > 0 ? rows[0] : null;
    } catch (e) {
        return null;
    }
}

function getResponse(requestId, responseType, deKey) {
    try {
        if (!requestId || !responseType || !deKey) {
            return null;
        }

        // Always use External Key for LookupRows
        var rows = Platform.Function.LookupRows(
            deKey,
            ["RequestId"],
            [requestId]
        );

        if (!rows || rows.length === 0) {
            return null;
        }

        var r = rows[0];

        /* ===============================
           KNOWLEDGE RESPONSE
        =============================== */
        if (responseType === "Knowledge") {
            return {
                type: "Knowledge",
                text: r.Response || null,
                followupPrompt: r.FollowupPrompt ||
                    "Har du brug for mere information eller direkte hjælp? Udfyld formularen herunder, så kontakter en rådgiver dig hurtigst muligt.",
                pageUrl: r.PageURL || null
            };
        }

        /* ===============================
           EVENT RESPONSE
        =============================== */
        if (responseType === "Event") {
            return {
                type: "Event",
                text: r.Description || r.Response || null,
                followupPrompt: r.FollowupPrompt ||
                    "Vil du gerne tilmeldes dette event? Udfyld formularen herunder, så sørger vi for din tilmelding eller kontakter dig med flere detaljer.",
                event: {
                    eventId: r.EventId || null,
                    name: r.Name || null,
                    startDate: r.StartDate || null,
                    endDate: r.EndDate || null,
                    city: r.City || null,
                    address: r.Address || null,
                    description: r.Description || null
                },
                pageUrl: r.PageURL || null
            };
        }

        /* ===============================
           PRODUCT RESPONSE
        =============================== */
        if (responseType === "Product") {
            return {
                type: "Product",
                text: r.Description || null,
                followupPrompt: r.FollowupPrompt ||
                    "Har du brug for hjælp til at vælge det rette produkt til jeres virksomhed? Udfyld formularen herunder, så kontakter en rådgiver dig og hjælper jer videre.",
                product: {
                    productId: r.ProductId || null,
                    name: r.Name || null,
                    description: r.Description || null,
                    subscriptionType: SubscriptionType || null,
                    price: Price || null
                }
            };
        }

        return null;

    } catch (e) {
        return null;
    }
}

var API_KEY = Platform.Function.Lookup(
    "ChatBotServiceConfig",
    "API_KEY",
    "LookupVal",
    1
);

var apiKey     = Request.GetQueryStringParameter("apikey");
var categoryId = Request.GetQueryStringParameter("categoryid");
var topicId    = Request.GetQueryStringParameter("topicid");
var subtopicId = Request.GetQueryStringParameter("subtopicid");
  
if (!checkApiKey(apiKey, API_KEY)) {
    Platform.Response.Write(
        Stringify({ error: "Invalid API key" })
    );
    return;
}


var result = {
    state: {
        categoryId: categoryId || null,
        topicId: topicId || null,
        subtopicId: subtopicId || null
    },
    prompt: "",
    options: [],
    response: null,
    done: false
};
  
if (!categoryId) {
    result.prompt = "Hvad vil du gerne vide mere om?";
    result.options = getCategories();
}

/* ---------- Category → Topics ---------- */
else if (categoryId && !topicId) {
    result.prompt = "Vælg et emne:";
    result.options = getTopics(categoryId);
}

/* ---------- Topic ---------- */
else if (topicId && !subtopicId) {

    var topic = getTopic(topicId);

    if (!topic) {
        result.response = {
            status: "Error",
            statusCode: 404,
            type: "NotFound",
            message: "Beklager, jeg kunne ikke finde et svar, der matcher din forespørgsel lige nu.",
            followupPrompt:
              "Udfyld venligst formularen herunder, hvis du ønsker at blive kontaktet direkte.",
            data: null
        };
        result.prompt = "";
        result.done = true;
    }
    else if (topic.IsTerminalNode == true) {

        var r = getResponse(topicId, topic.ResponseType, topic.ResponseDeKey);

        if (r) {
            result.response = {
                status: "OK",
                statusCode: 200,
                type: r.type,
                message: r.text,
                followupPrompt: r.followupPrompt || null,
                data: r.event || r.product || null
            };

            if (r.type === "Knowledge") {
                result.prompt = "Her er det, jeg fandt til dig";
            } else if (r.type === "Event") {
                result.prompt = "Her er vores kommende arrangement";
            } else if (r.type === "Product") {
                result.prompt = "Her er vores produkter, som matcher dit behov";
            } else {
                result.prompt = "Her er det, jeg fandt til dig";
            }

        } else {
            result.response = {
                status: "Error",
                statusCode: 404,
                type: "NotFound",
                message: "Beklager, jeg kunne ikke finde et svar, der matcher din forespørgsel lige nu.",
                followupPrompt:
                  "Udfyld venligst formularen herunder, hvis du ønsker at blive kontaktet direkte.",
                data: null
            };
            result.prompt = "";
        }

        result.done = true;
    }
    else {
        result.prompt = "Vælg en underkategori:";
        result.options = getSubtopics(topicId);
    }
}

/* ---------- SubTopic (always terminal) ---------- */
else if (subtopicId) {

    var subtopic = getSubtopic(subtopicId);

    if (!subtopic) {
        result.response = {
            status: "Error",
            statusCode: 404,
            type: "NotFound",
            message: "Beklager, jeg kunne ikke finde et svar, der matcher din forespørgsel lige nu.",
            followupPrompt:
              "Udfyld venligst formularen herunder, hvis du ønsker at blive kontaktet direkte.",
            data: null
        };
        result.prompt = "";
        result.done = true;
    }
    else {

        var r2 = getResponse(
            subtopicId,
            subtopic.ResponseType,
            subtopic.ResponseDeKey
        );

        if (r2) {
            result.response = {
                status: "OK",
                statusCode: 200,
                type: r2.type,
                message: "Response retrieved successfully.",
                followupPrompt: r2.followupPrompt || null,
                data: { responseText: r2.text } || r2.event || r2.product || null
            };

            if (r2.type === "Knowledge") {
                result.prompt = "Her er det, jeg fandt til dig";
            } else if (r2.type === "Event") {
                result.prompt = "Her er vores kommende arrangement";
            } else if (r2.type === "Product") {
                result.prompt = "Her er vores produkter, som matcher dit behov";
            } else {
                result.prompt = "Her er det, jeg fandt til dig";
            }

        } else {
            result.response = {
                status: "Error",
                statusCode: 404,
                type: "NotFound",
                message: "Beklager, jeg kunne ikke finde et svar, der matcher din forespørgsel lige nu.",
                followupPrompt:
                  "Udfyld venligst formularen herunder, hvis du ønsker at blive kontaktet direkte.",
                data: null
            };
            result.prompt = "";
        }

        result.done = true;
    }
}

Platform.Response.Write(Stringify(result));

</script>-->