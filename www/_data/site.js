// On first deploy from Netlify button, the REPOSITORY_URL is in the form "git@github.com:user/repo", this function lets the first deploy work
function getGithubInfo(info) {
  let github;
  let user;
  let repo;
  try {
    github = new URL(process.env.REPOSITORY_URL).pathname.split("/");
    user = github[1];
    repo = github[2];
  } catch(err) {
    github = process.env.REPOSITORY_URL.slice(15).split("/");
    user = github[0];
    repo = github[1];
  }
  
  if (info === "user"){
    return user;
  } else {
    return repo;
  }
}

module.exports = {
  title: process.env.SITE_TITLE,
  description: process.env.SITE_DESCRIPTION,
  full_url: process.env.URL,
  url: new URL(process.env.URL).origin,
  domain: new URL(process.env.URL).hostname,
  logo: "/images/avatar-tt@800.png",
  author: {
    name: process.env.AUTHOR_NAME,
    email: process.env.AUTHOR_EMAIL,
    url: new URL(process.env.URL).origin,
    photo: new URL(process.env.URL).origin + "/images/avatar-tt.svg"
  },
  theme: "basic",
  GITHUB_TOKEN: process.env.GITHUB_TOKEN,
  GITHUB_URL: process.env.REPOSITORY_URL,
  CONTEXT: process.env.CONTEXT,
  GITHUB_USER: getGithubInfo("user"),
  GITHUB_REPO: getGithubInfo("repo")
};
