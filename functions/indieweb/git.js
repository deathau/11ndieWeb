const { Octokit } = require("@octokit/rest");

async function add(tree, content, path, site, encoding = "utf-8",) {
  let treeObject = await createGitTreeObject(content, path, encoding, site);
  tree.push(treeObject);
  return tree;
}

async function commit(tree, commitMessage, site) {
  let octo = new Octokit({
    auth: site.GITHUB_TOKEN,
  });
  // Get current commit and tree SHA
  let currentCommitSha = await getCurrentCommit(octo, site);
  let currentTreeSha = await getCurrentTree(currentCommitSha, octo, site);

  // create a tree, need it's SHA for the commit
  let { data: newTreeData } = await octo.git.createTree({
    owner: site.GITHUB_USER,
    repo: site.GITHUB_REPO,
    tree: tree,
    base_tree: currentTreeSha,
  });

  // create a new commit using new tree's SHA and current commit SHA as parent commit
  let { data: newCommitData } = await octo.git.createCommit({
    owner: site.GITHUB_USER,
    repo: site.GITHUB_REPO,
    message: commitMessage,
    tree: newTreeData.sha,
    parents: [currentCommitSha],
  });

  // Update the ref
  let commitResponse = await octo.git.updateRef({
    owner: site.GITHUB_USER,
    repo: site.GITHUB_REPO,
    ref: `heads/main`,
    sha: newCommitData.sha,
    force: true
  });

  return commitResponse.status;
}

async function createBlob(content, encoding, site) {
  let octo = new Octokit({
    auth: site.GITHUB_TOKEN,
  });
  let { data: blob } = await octo.git.createBlob({
    owner: site.GITHUB_USER,
    repo: site.GITHUB_REPO,
    content: content,
    encoding: encoding,
  });

  return blob;
}

async function createGitTreeObject(content, path, encoding, site) {
  let blob = await createBlob(content, encoding, site);

  return {
    path: path,
    mode: "100644", // blob
    type: "blob",
    sha: blob.sha, // base64 or utf-8 encoded
  };
}

async function getCurrentCommit(octo, site) {
  let { data: refData } = await octo.rest.git.getRef({
    owner: site.GITHUB_USER,
    repo: site.GITHUB_REPO,
    ref: "heads/main",
  });

  return refData.object.sha;
}

async function getCurrentTree(commitSha, octo, site) {
  let { data: commitData } = await octo.rest.git.getCommit({
    owner: site.GITHUB_USER,
    repo: site.GITHUB_REPO,
    commit_sha: commitSha,
  });
  return commitData.tree.sha;
}

async function getContent(path, site) {
  let octo = new Octokit({
    auth: site.GITHUB_TOKEN,
  });

  const { data } = await octo.rest.repos.getContent({
    owner: site.GITHUB_USER,
    repo: site.GITHUB_REPO,
    path: path
  });

  let content = Buffer.from(data.content, "base64").toString("utf-8");

  return content;
}

async function deleteFile(path, site) {
  let octo = new Octokit({
    auth: site.GITHUB_TOKEN,
  });

  const { data } = await octo.rest.repos.getContent({
    owner: site.GITHUB_USER,
    repo: site.GITHUB_REPO,
    path: path
  });

  const { deleteData } = await octo.rest.repos.deleteFile({
    owner: site.GITHUB_USER,
    repo: site.GITHUB_REPO,
    path: path,
    sha: data.sha,
    message: "Deleting file for testing"
  });

  return deleteData;
}

module.exports = {
  add,
  commit,
  createBlob,
  deleteFile,
  getContent
};
