const { mf2 } = require("microformats-parser");
const axios = require("axios");

// Fetch html from target url
async function fetchHtml(url) {
  try {
    var response = await axios.get(url);
    return response.data;
  } catch (err) {
    return false;
  }
}

async function getEndpoints(me) {
  let html = await fetchHtml(me);

  if(!html) {
    return "Problem fetching endpoints";
  }

  let parsedHtml = mf2(html, { baseUrl: me });

  if (!parsedHtml.rels.authorization_endpoint) {
    return {
      statusCode: 400,
      body: "No endpoint found",
    };
  }

  let endpoints = {};
  endpoints.auth = parsedHtml.rels.authorization_endpoint[0];
  endpoints.token = parsedHtml.rels.token_endpoint
    ? parsedHtml.rels.token_endpoint[0]
    : false;
  endpoints.micropub = parsedHtml.rels.micropub
    ? parsedHtml.rels.micropub[0]
    : false;

  return endpoints;
}

module.exports = {
  getEndpoints
};