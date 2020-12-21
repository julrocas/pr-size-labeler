import * as core from "@actions/core";
import * as github from "@actions/github";
import * as yaml from "js-yaml";

async function run() {
  try {
    const token = core.getInput("repo-token", { required: true });
    const configPath = core.getInput("configuration-path", { required: true });

    const prNumber = getPrNumber();
    if (!prNumber) {
      console.log("Could not get pull request number from context, exiting");
      return;
    }

    const client = new github.GitHub(token);

    const { data: pullRequest } = await client.pulls.get({
      owner: github.context.repo.owner,
      repo: github.context.repo.repo,
      pull_number: prNumber
    });

    const labelLimits: Map<string, number> = await getLabelLimits(
      client,
      configPath
    );

    const changesSize = pullRequest.additions + pullRequest.deletions;
    const labels: string[] = [];
    const labelsToRemove: string[] = [];
    let found = false;

    for (const [label, limit] of labelLimits.entries()) {
      core.debug(`processing ${label}`);
      if ((!found) && (changesSize <= limit)){
        found = true;
        labels.push(label);
      } else if (pullRequest.labels.find(l => l.name === label)) {
        labelsToRemove.push(label);
      }
    }

    if (labels.length > 0) {
      await addLabels(client, prNumber, labels);
    }

    if (labelsToRemove.length > 0) {
      await removeLabels(client, prNumber, labelsToRemove);
    }
  } catch (error) {
    core.error(error);
    core.setFailed(error.message);
  }
}

function getPrNumber(): number | undefined {
  const pullRequest = github.context.payload.pull_request;
  if (!pullRequest) {
    return undefined;
  }

  return pullRequest.number;
}

async function getLabelLimits(
  client: github.GitHub,
  configurationPath: string
): Promise<Map<string, number>> {
  const configurationContent: string = await fetchContent(
    client,
    configurationPath
  );

  // loads (hopefully) a `{[label:string]: string | StringOrMatchConfig[]}`, but is `any`:
  const configObject: any = yaml.safeLoad(configurationContent);

  // transform `any` => `Map<string,StringOrMatchConfig[]>` or throw if yaml is malformed:
  return getLabelLimitMapFromObject(configObject);
}

async function fetchContent(
  client: github.GitHub,
  repoPath: string
): Promise<string> {
  const response: any = await client.repos.getContents({
    owner: github.context.repo.owner,
    repo: github.context.repo.repo,
    path: repoPath,
    ref: github.context.sha
  });

  return Buffer.from(response.data.content, response.data.encoding).toString();
}

function getLabelLimitMapFromObject(
  configObject: any
): Map<string, number> {
  const labelLimits: Map<string, number> = new Map();
  let last_limit = 0;
  for (const label in configObject) {
    if (typeof configObject[label] === "number") {
      if (last_limit >= configObject[label]) {
        throw Error(
          `found invalid limit for label ${label} (upper limit value should be greater than the last one and zero)`
        );
      }
      last_limit = configObject[label];
      labelLimits.set(label, configObject[label]);
    } else if ((typeof configObject[label] === "string") && (configObject[label] === "Infinity")) {
      last_limit = Infinity;
      labelLimits.set(label, Infinity);
    } else {
      throw Error(
        `found unexpected type for label ${label} (should be a number or Infinity)`
      );
    }
  }

  return labelLimits;
}

async function addLabels(
  client: github.GitHub,
  prNumber: number,
  labels: string[]
) {
  await client.issues.addLabels({
    owner: github.context.repo.owner,
    repo: github.context.repo.repo,
    issue_number: prNumber,
    labels: labels
  });
}

async function removeLabels(
  client: github.GitHub,
  prNumber: number,
  labels: string[]
) {
  await Promise.all(
    labels.map(label =>
      client.issues.removeLabel({
        owner: github.context.repo.owner,
        repo: github.context.repo.repo,
        issue_number: prNumber,
        name: label
      })
    )
  );
}

run();
