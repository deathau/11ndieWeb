const { Octokit } = require("@octokit/rest");
const site = require("../www/_data/site");


const options = {
  "functionsDirectory":"functions",
  "dataDirectory":"www/_data",
  "acceptedDomains":["fluffy-lily-cef646.netlify.app","monrepos.online"],
  "tokenEndpoint":"https://tokens.indieauth.com/token"
};

const getContent = async (path) => {
  const { data } = await octo.rest.repos.getContent({
    owner: site.GITHUB_USER,
    repo: site.GITHUB_REPO,
    path: path,
    ref: `heads/activitypub`
  });

  return Buffer.from(data.content, "base64").toString("utf-8");
}

const validateContentType = (contentType) => {
  return contentType === 'application/ld+json; profile="https://www.w3.org/ns/activitystreams"'
      || contentType === 'application/activity+json'
}

const processInboxPost = async (event) => {
  if(validateContentType(event.headers["content-type"])) {
    return {
      statusCode: 501,
      body: JSON.stringify(event)
    }
  }
  else return {
    statusCode: 400,
    body: 'Bad Request — Content-Type must be \'application/ld+json; profile="https://www.w3.org/ns/activitystreams"\' (\'application/activity+json\' is also acceptable)'
  }
}

const processInboxRequest = async (event) => {
  if(event.httpMethod === "GET") {
    content = await getContent(options.dataDirectory + '/inbox.json')
    return {
      statusCode: 200,
      body: content
    }
  }
  else if(event.httpMethod === "POST") {
    return await processInboxPost(event)
  }
  else {
    return {
      statusCode: 405,
      body: 'Method not allowed. Only GET and POST accepted.'
    }
  }
}

exports.handler = async function (event) {

  switch (event.path.split("/")[2]) {
    case "inbox":
      return await processInboxRequest(event)
    default:
      return {
        statusCode: 404,
        body: "Page not found"
      };
  }
};