import * as core from "@actions/core";
import * as github from "@actions/github";

async function run() {
  try {
    const token = core.getInput("repo-token", { required: true });

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

    const labelsConfig = [{name: 'Small Change', lower_limit: 0, upper_limit: 10},
                          {name: 'Medium Change', lower_limit: 11, upper_limit: 30},
                          {name: 'Big Change', lower_limit: 31, upper_limit: Infinity}];

    const changesSize = pullRequest.additions + pullRequest.deletions;

    const labels: string[] = [];
    const labelsToRemove: string[] = [];
    for (let label of labelsConfig) {
      core.debug(`processing ${label}`);
      if ((changesSize > label.lower_limit) && (changesSize < label.upper_limit)){
        labels.push(label.name);
      } else if (pullRequest.labels.find(l => l.name === label.name)) {
        labelsToRemove.push(label.name);
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
