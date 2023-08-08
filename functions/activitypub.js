const options = {
  "functionsDirectory":"functions",
  "dataDirectory":"www/_data",
  "acceptedDomains":["fluffy-lily-cef646.netlify.app","monrepos.online"],
  "tokenEndpoint":"https://tokens.indieauth.com/token"
};

exports.handler = async function (event) {

  switch (event.path.split("/")[2]) {
    case "inbox":
      return {
        statusCode: 501,
        body: JSON.stringify(event)
      }
    default:
      return {
        statusCode: 404,
        body: "Page not found"
      };
  }
};