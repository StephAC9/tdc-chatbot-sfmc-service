<script runat="server">

Platform.Load("Core", "1.1.1");

/* ---------------------------------------------------
   CONFIG
--------------------------------------------------- */
var API_KEY = "00000";
var MAIN_DE = "PersonalizedTrainedChatBot_MainData";
var RATE_LIMIT_DE = "PersonalizedTrainedChatBot_API_RateLimit";
var LOG_DE = "PersonalizedTrainedChatBot_API_UsageLog";
var RATE_LIMIT_MAX = 60;
var RATE_LIMIT_WINDOW = 60000; // 60 seconds rolling window
var missingResponse = "Der blev desværre ikke fundet et svar. Udfyld venligst formularen, så vender en af mine kolleger tilbage til dig hurtigst muligt."

/* ---------------------------------------------------
   INPUTS
--------------------------------------------------- */
var apikey = Request.GetQueryStringParameter("apikey");
var topic = Request.GetQueryStringParameter("topic");
var subtopic = Request.GetQueryStringParameter("subtopic");
var rank = Request.GetQueryStringParameter("rank");
var nextResponse = Request.GetQueryStringParameter("nextResponse");
var clientId = getClientId();

/* ---------------------------------------------------
   MAIN EXECUTION FLOW
--------------------------------------------------- */
if (!checkApiKey(apikey)) {
    Write('{"error":"Invalid or missing API key"}');
    return;
}

if (!checkRateLimit(clientId)) {
    if (shouldLog()) logRequest(false);
    Write('{"error":"Rate limit exceeded"}');
    return;
}

/* Ranking endpoints — NO LOGGING */
if (rank === "topics") {
    Write(getRanking());
    return;
}

if (rank === "next_topics") {
    Write(getNextRanking());
    return;
}

/* No topic/subtopic — NO LOGGING */
if (!topic && !subtopic) {
    Write(getAllTopics());
    return;
}

/* Topic only — LOG */
if (topic && !subtopic) {
    var subs = getSubtopics(topic);
    if (shouldLog()) logRequest(true);
    Write(subs);
    return;
}

/* Topic + subtopic — LOG */
var response = getResponse(topic, subtopic, nextResponse);
if (shouldLog()) logRequest(true);
Write(response);


/* ---------------------------------------------------
   FUNCTIONS
--------------------------------------------------- */

/* Only log when a topic is selected */
function shouldLog() {
    return topic && topic !== "";
}

/* Get client identifier */
function getClientId() {
    var ipHeader = Request.GetHeader("X-Forwarded-For");
    if (ipHeader && ipHeader !== "") {
        var parts = ipHeader.split(",");
        return parts[0].trim();
    }

    var ua = Request.GetHeader("User-Agent");
    if (ua && ua !== "") return ua;

    return "unknown-client";
}

/* API key validation */
function checkApiKey(key) {
    return key && key === API_KEY;
}

/* ---------------------------------------------------
   SAFE UPSERT RATE LIMITING
--------------------------------------------------- */
function checkRateLimit(clientId) {
    var limitDE = DataExtension.Init(RATE_LIMIT_DE);
    var rows = limitDE.Rows.Lookup("IP", clientId);
    var now = new Date();

    if (!rows || rows.length === 0) {
        // Create new row
        limitDE.Rows.Add({
            IP: clientId,
            WindowStart: now,
            Count: 1
        });
        return true;
    }

    var row = rows[0];
    var start = new Date(row["WindowStart"]);
    var count = parseInt(row["Count"], 10);
    if (isNaN(count)) count = 0;

    // Rolling window reset
    if (now - start > RATE_LIMIT_WINDOW) {
        limitDE.Rows.Update(
            { WindowStart: now, Count: 1 },
            ["IP"], [clientId]
        );
        return true;
    }

    // Limit reached
    if (count >= RATE_LIMIT_MAX) return false;

    // Safe UPSERT update
    limitDE.Rows.Update(
        { Count: count + 1 },
        ["IP"], [clientId]
    );

    return true;
}

/* Logging */
function logRequest(allowed) {
    var logDE = DataExtension.Init(LOG_DE);
    logDE.Rows.Add({
        Timestamp: new Date(),
        IP: clientId,
        Endpoint: "API",
        Topic: topic,
        Subtopic: subtopic,
        Allowed: allowed
    });
}

/* Increment request count */
function incrementCount(rowObj, de) {
    var current = parseInt(rowObj["RequestCount"], 10);
    if (isNaN(current)) current = 0;

    de.Rows.Update(
        {
            RequestCount: current + 1,
            LastRequestedDate: Now()
        },
        ["Topic", "SubTopic"],
        [rowObj["Topic"], rowObj["SubTopic"]]
    );
}

/* Return all topics */
function getAllTopics() {
    var de = DataExtension.Init(MAIN_DE);
    var rows = de.Rows.Retrieve();
    var topics = {};
    var list = [];

    for (var i = 0; i < rows.length; i++) {
        var t = rows[i]["Topic"];
        if (t && !topics[t]) {
            topics[t] = true;
            list.push('"' + t + '"');
        }
    }

    return '{"topics":[' + list.join(",") + ']}';
}

/* Return subtopics for a topic */  
function getSubtopics(topic) {
    var de = DataExtension.Init(MAIN_DE);
    var rows = de.Rows.Lookup("Topic", topic);
    var subs = [];

    if (!rows || rows.length === 0) {
        return '{"topic":"' + topic + '","subtopics":[]}';
    }

    for (var i = 0; i < rows.length; i++) {
        incrementCount(rows[i], de);
        subs.push('"' + rows[i]["SubTopic"] + '"');
    }

    return '{"topic":"' + topic + '","subtopics":[' + subs.join(",") + ']}';
}

/* ---------------------------------------------------
   getResponse() — Rank1 / Rank2 / Rank3
--------------------------------------------------- */
function getResponse(topic, subtopic, nextResponse) {

    if (!nextResponse || nextResponse === "") nextResponse = 0;
    nextResponse = parseInt(nextResponse, 10);

    var de = DataExtension.Init(MAIN_DE);
    var rows = de.Rows.Lookup(["Topic", "SubTopic"], [topic, subtopic]);

    if (!rows || rows.length === 0) {
        return '{"topic":"' + topic + '","subtopic":"' + subtopic + '","response":"'+missingResponse+'"}';
    }

    incrementCount(rows[0], de);

    var r1 = rows[0]["Response_Rank1"];
    var r2 = rows[0]["Response_Rank2"];
    var ht = rows[0]["FormHeaderText"];
  

    var selected = "";

    if (nextResponse === 0) {
        if (!r1 || r1 === "") return '{"topic":"' + topic + '","subtopic":"' + subtopic + '","response":"'+missingResponse+'"}';
        selected = r1;
    }
    else if (nextResponse === 1) {
        if (!r2 || r2 === "") return '{"topic":"' + topic + '","subtopic":"' + subtopic + '","response":"'+missingResponse+'"}';
        selected = r2;
    }
    else {
        return '{"topic":"' + topic + '","subtopic":"' + subtopic + '","response":"'+missingResponse+'"}';
    }

    selected = selected.replace(/"/g, '\\"');

    return '{"topic":"' + topic + '","subtopic":"' + subtopic + '","response":"' + selected + '","headertext":"'+ht+'"}';
}

/* ---------------------------------------------------
   Ranking: Top 5
--------------------------------------------------- */
function getRanking() {
    var de = DataExtension.Init(MAIN_DE);
    var rows = de.Rows.Retrieve();
    var agg = [];

    function findTopicIndex(topic) {
        for (var i = 0; i < agg.length; i++) {
            if (agg[i].topic === topic) return i;
        }
        return -1;
    }

    for (var i = 0; i < rows.length; i++) {
        var t = rows[i]["Topic"];
        var c = parseInt(rows[i]["RequestCount"], 10);
        if (isNaN(c)) c = 0;

        var idx = findTopicIndex(t);
        if (idx === -1) agg.push({ topic: t, score: c });
        else agg[idx].score += c;
    }

    // Bubble sort
    for (var a = 0; a < agg.length; a++) {
        for (var b = a + 1; b < agg.length; b++) {
            if (agg[b].score > agg[a].score) {
                var temp = agg[a];
                agg[a] = agg[b];
                agg[b] = temp;
            }
        }
    }

    var limit = agg.length < 5 ? agg.length : 5;

    var json = '{"ranking":[';
    for (var i = 0; i < limit; i++) {
        if (i > 0) json += ",";
        json += '{"topic":"' + agg[i].topic + '","score":' + agg[i].score + '}';
    }
    json += "]}";

    return json;
}

/* ---------------------------------------------------
   Ranking: Next 5 (positions 6–10)
--------------------------------------------------- */
function getNextRanking() {
    var de = DataExtension.Init(MAIN_DE);
    var rows = de.Rows.Retrieve();
    var agg = [];

    function findTopicIndex(topic) {
        for (var i = 0; i < agg.length; i++) {
            if (agg[i].topic === topic) return i;
        }
        return -1;
    }

    for (var i = 0; i < rows.length; i++) {
        var t = rows[i]["Topic"];
        var c = parseInt(rows[i]["RequestCount"], 10);
        if (isNaN(c)) c = 0;

        var idx = findTopicIndex(t);
        if (idx === -1) agg.push({ topic: t, score: c });
        else agg[idx].score += c;
    }

    // Bubble sort
    for (var a = 0; a < agg.length; a++) {
        for (var b = a + 1; b < agg.length; b++) {
            if (agg[b].score > agg[a].score) {
                var temp = agg[a];
                agg[a] = agg[b];
                agg[b] = temp;
            }
        }
    }

    var start = 5;
    var end = agg.length < 10 ? agg.length : 10;

    var json = '{"ranking":[';
    for (var i = start; i < end; i++) {
        if (i > start) json += ",";
        json += '{"topic":"' + agg[i].topic + '","score":' + agg[i].score + '}';
    }
    json += "]}";

    return json;
}

</script>






















<script runat="server">
Platform.Load("Core", "1.1.1");

/* ---------------------------------------------------
   CONFIG
--------------------------------------------------- */
var API_KEY = "00000";
var RESOURCE_DE = "ResourcePages";

/* ---------------------------------------------------
   INPUTS
--------------------------------------------------- */
var apiKey = Request.GetQueryStringParameter("apikey");
var query  = Request.GetQueryStringParameter("query");

/* ---------------------------------------------------
   AUTH
--------------------------------------------------- */
if (!apiKey || apiKey !== API_KEY) {
    Platform.Response.Write('{"error":"Invalid API key"}');
    return;
}

if (!query) {
    Platform.Response.Write('{"error":"Missing query parameter"}');
    return;
}

/* ---------------------------------------------------
   LOOKUP TARGET PAGE
--------------------------------------------------- */
var pageId = Platform.Function.Lookup(
    RESOURCE_DE,
    "PageId",
    "Key",
    query
);

if (!pageId) {
    Platform.Response.Write('{"error":"No resource page found"}');
    return;
}

/* ---------------------------------------------------
   ROUTING LOGIC
--------------------------------------------------- */
var redirectUrl;

/* topic */
if (query === "topic") {

    redirectUrl = CloudPagesURL(pageId);

}

/* subtopic */
else if (query === "subtopic") {

    var topicId = Request.GetQueryStringParameter("topicid");

    if (!topicId) {
        Platform.Response.Write('{"error":"Missing topicid"}');
        return;
    }

    redirectUrl = CloudPagesURL(
        pageId,
        "topicid", topicId
    );
}

/* response */
else if (query === "response") {

    var topicId    = Request.GetQueryStringParameter("topicid");
    var subtopicId = Request.GetQueryStringParameter("subtopicid");

    if (!topicId || !subtopicId) {
        Platform.Response.Write('{"error":"Missing parameters"}');
        return;
    }

    redirectUrl = CloudPagesURL(
        pageId,
        "topicid", topicId,
        "subtopicid", subtopicId
    );
}

/* unknown */
else {
    Platform.Response.Write('{"error":"Unsupported query"}');
    return;
}

/* ---------------------------------------------------
   REDIRECT
--------------------------------------------------- */
Platform.Response.Redirect(redirectUrl);

</script>