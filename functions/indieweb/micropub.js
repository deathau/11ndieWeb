const { Base64 } = require("js-base64");
const mpHelper = require("./micropub-helper");
const slugify = require("slugify");
const git = require("./git");

function fileTemplate(mp) {
  let post = `---\r\n`;
  let data = mp.properties;

  let postData = {};

  let keys = Object.keys(data);
  keys.forEach(function (key) {
    if (key === "name") {
      postData.title = data.name[0];
      post = post + `title: ${data[key]}\r\n`;
    } else if (key === "published") {
      postData.date = data.published[0];
      post = post + `date: ${data[key]}\r\n`;
    } else if (key === "category") {
      postData.tags = data.category;
      post = post + `tags: [${data.category}]\r\n`;
    } else if (key === "content") {
      //skip
    } else if (key === "photo") {
      post = post + `photo: [${data.photo}]\r\n`;
    } else {
      postData[key] = data[key];
      post = post + `${key}: ${data[key]}\r\n`;
    }
  });

  post = post + `---\r\n`;

  if (data.hasOwnProperty("content")) {
    if (typeof data.content[0] === "object") {
      postData.content = data.content[0].html;
      post = post + `${data.content[0].html}`;
    } else {
      postData.content = data.content;
      post = post + `${data.content}`;
    }
  }
  // console.log(post);
  return post;
}

function postTypeDiscovery(mf2) {
  mf2.postType = "note";
  mf2.path = "www/posts/notes";

  if (mf2.properties.hasOwnProperty("name")) {
    if (mf2.properties.name[0] != "") {
      mf2.postType = "article";
      mf2.path = "www/posts/articles";
    }
  }
  if (mf2.properties.hasOwnProperty("in-reply-to")) {
    mf2.postType = "reply";
    mf2.path = "www/posts/replies";
  }
  if (mf2.properties.hasOwnProperty("rsvp")) {
    mf2.postType = "rsvp";
    mf2.path = "www/posts/rsvps";
  }
  if (mf2.properties.hasOwnProperty("repost-of")) {
    mf2.postType = "repost-of";
    mf2.path = "www/posts/reposts";
  }
  if (mf2.properties.hasOwnProperty("like-of")) {
    mf2.postType = "like-of";
    mf2.path = "www/posts/favorites";
  }
  if (mf2.properties.hasOwnProperty("bookmark-of")) {
    mf2.postType = "bookmark-of";
    mf2.path = "www/posts/bookmarks";
  }

  return mf2;
}

module.exports = async (event, options) => {
  let site = options.site;
  let mpData = await mpHelper(event, options.tokenEndpoint);
  // TODO Check scopes

  if (mpData.statusCode != 200) {
    return mpData;
  }

  if (mpData.query) {
    switch (mpData.query) {
      case "config":
        // get config and return
        mpData.headers = { "Content-Type": "application/json" };
        mpData.body = {
          "media-endpoint": `${site.url}/11ndieweb/micropub`,
        };
        mpData.body = JSON.stringify(mpData.body);
        return mpData;
      case "source":
        // get source data and return
        return mpData;
      case "syndicate-to":
        // get syndications and return
        return mpData;
    }
  }

  let slug = "";

  if (mpData.properties.hasOwnProperty("mp-slug")) {
    slug = slugify(mpData.properties["mp-slug"][0], {
      lower: true,
      strict: true,
    });
    delete mpData.properties["mp-slug"];
  } else if (mpData.properties.hasOwnProperty("name")) {
    slug = slugify(mpData.properties.name[0], { lower: true, strict: true });
  } else if (mpData.properties.hasOwnProperty("content")) {
    // first 25 characters of content is slug
    if (typeof mpData.properties.content[0] === "object") {
      slug = slugify(mpData.properties.content[0].html.substr(0, 30), {
        lower: true,
        strict: true,
      });
    } else {
      slug = slugify(mpData.properties.content[0].substr(0, 30), {
        lower: true,
        strict: true,
      });
    }
  } else {
    slug = slugify(JSON.stringify(mpData.properties).substr(0, 30), {
      lower: true,
      strict: true,
    });
  }

  let date = new Date().toISOString();

  if (mpData.properties.hasOwnProperty("published")) {
    date = new Date(mpData.properties.published[0]).toISOString;
  } else {
    mpData.properties.published = [date];
  }

  date = date.split("T")[0];

  let tree = [];
  let commitMessage = "Micropub post: ";

  if (mpData.files) {
    for (const file of mpData.files) {
      if (file.photo) {
        if (mpData.properties.photo) {
          mpData.properties.photo.push(`${site.url}/images/${file.filename}`);
        } else {
          mpData.properties.photo = [`${site.url}/images/${file.filename}`];
        }
        let encodedPhoto = Base64.btoa(file.photo);
        let path = `www/images/${file.filename}`;
        tree = await git.add(tree, encodedPhoto, path, site, "base64");
      }

      if (file.file) {
        let encodedFile = Base64.btoa(file.file);
        let path = `www/images/${file.filename}`;
        tree = await git.add(tree, encodedFile, path, site, "base64");
        commitMessage = commitMessage + file.filename;
        await git.commit(tree, commitMessage, site);
        return {
          headers: {
            location: site.url + "/" + path,
          },
          statusCode: 201,
        };
      }
    }
  }
  let markdown;
  if (mpData.type) {
    // handle post and return
    let filename = date + "-" + slug + ".md";
    // console.log(filename);
    mpData = postTypeDiscovery(mpData);

    markdown = fileTemplate(mpData);
    let path = mpData.path + "/" + filename;
    tree = await git.add(tree, markdown, path, site);
    // console.log(tree);

    commitMessage = commitMessage + `${filename}`;
    let commitStatus = await git.commit(tree, commitMessage, site);
    // console.log(commitStatus);
  }

  // console.log(mpData);

  let response = {
    headers: {
      location: site.url,
    },
    statusCode: 201,
    markdown: markdown,
    micropub: mpData
  };
  return response;
};
