const fs = require("fs");
const webmention = require("./webmention-receiver");
const micropub = require("./micropub");

module.exports = function (eleventyConfig, options = {}) {
  let defaults = {
    functionsDirectory: "functions",
    dataDirectory: "www/_data",
    acceptedDomains: [new URL(process.env.URL).host],
    tokenEndpoint: "https://tokens.indieauth.com/token"
  };

  options = Object.assign(defaults, options);

  // Here we write the options to 11ndieweb.js so it stays with our bundled function
  let indieweb = fs.readFileSync(__dirname + "/11ndieweb.js").toString().split("\n");
  let optionsLine = "const options = " + JSON.stringify(options) + ";";
  
  indieweb.splice(0,1,optionsLine);

  fs.writeFileSync(options.functionsDirectory+"/11ndieweb.js",indieweb.join("\n"));
};

module.exports.webmention = function(event, dataDirectory, acceptedDomains) {
  return webmention(event, dataDirectory, acceptedDomains);
};

module.exports.micropub = function(event, options) {
  return micropub(event, options);
};
