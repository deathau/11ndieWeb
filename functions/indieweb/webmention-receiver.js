const qs = require("querystring");
const crypto = require("crypto");
const wmverifier = require("webmention-verifier");
const git = require("./git");

// Functions

const commitMention = async (webmentions, message, dataDirectory, site) => {
  let tree = await git.add([],JSON.stringify(webmentions),dataDirectory+"/webmentions.json", site);
  await git.commit(tree, message, site);
};

const commitError = async (errorMsg, message, dataDirectory, site) => {
  let errors;
  try {
    errors = JSON.parse(await git.getContent(dataDirectory+"/errors.json", site));
  } catch(err) {
    errors = {
      type: "feed",
      name: "Errors",
      children: [],
    };
  }

  errors.children.splice(0, 0, errorMsg);

  let tree = await git.add([],JSON.stringify(errors),dataDirectory+"/errors.json", site);
  await git.commit(tree, message, site);
};

module.exports = async (event, options) => {
  let dataDirectory = options.dataDirectory;
  let acceptedDomains = options.acceptedDomains;
  let site = options.site;
  const data = qs.parse(event.body);

  if (!Object.keys(data).includes("source")) {
    return {
      statusCode: 400,
      body: "No source in body",
    };
  }

  data.target = decodeURI(data.target);
  data.source = decodeURI(data.source);

  const res = await wmverifier(data.source, data.target, acceptedDomains);
  const mention = res.webmention;

  if (mention === false) {
    let msg = JSON.stringify(res.body) + JSON.stringify(event);
    let errorMsg = {
      statusCode: res.statusCode,
      error: msg,
      source: data.source,
    };
    await commitError(errorMsg, "Faulty webmention received", dataDirectory, site);
    return res;
  }

  let webmentions;
  try {
    webmentions = JSON.parse(await git.getContent(dataDirectory+"/webmentions.json"));
  } catch(err) {
    webmentions = {
      type: "feed",
      name: "Webmentions",
      children: [],
    };
  }
  // See if target/source combo already exist
  var comboIndex = -1;
  for (let i in webmentions.children) {
    if (
      webmentions.children[i]["wm-source"] === data.source &&
      webmentions.children[i]["wm-target"] === data.target
    ) {
      comboIndex = i;
    }
  }

  if (comboIndex >= 0) {
    // Update existing mention
    Object.assign(webmentions.children[comboIndex], mention);
    let str = "Update webmention from " + data.source;
    await commitMention(webmentions, str, site);
  } else {
    // New mention
    mention["wm-received"] = new Date().toISOString();
    mention["wm-id"] = crypto.randomBytes(12).toString("hex");
    webmentions.children.splice(0, 0, mention);
    let str = "Add webmention from " + data.source;
    await commitMention(webmentions, str, dataDirectory, site);
  }

  return {
    statusCode: 200,
    body: "Success!",
  };
};
