# Pull Request Size Labeler

Pull request size labeler triages PRs based on the size of the changes in the PR. Based on: https://github.com/actions/labeler

## Usage

### Create `.github/pr-size-labeler.yml`

Create a `.github/pr-size-labeler.yml` file with a list of labels and the size of changes this label has as upper limit.

The key is the name of the label in your repository that you want to add (eg: "Small Change", "Big Change") and the value is the upper limit of changes for that label (10, 20, Infinity). The labels must be in ascending order basend on the limit value.

#### Basic Example

```yml
'Small Change': 2
'Medium Change': 5
'Big Change': 10
'Huge Change': Infinity
```

### Create Workflow

Create a workflow (eg: `.github/workflows/pr-size-labeler.yml` see [Creating a Workflow file](https://help.github.com/en/articles/configuring-a-workflow#creating-a-workflow-file)) to utilize the labeler action with content:

```
name: "Pull Request Size Labeler"
on: [pull_request]

jobs:
  triage:
    runs-on: ubuntu-latest
    steps:
    - uses: julrocas/pr-size-labeler@main
      with:
        repo-token: "${{ secrets.GITHUB_TOKEN }}"
```

_Note: This grants access to the `GITHUB_TOKEN` so the action can make calls to GitHub's rest API_

#### Inputs

Two inputs are defined in [`action.yml`](action.yml) to let you configure the labeler:

| Name | Description | Default |
| - | - | - |
| `repo-token` | Token to use to authorize label changes. Typically the GITHUB_TOKEN secret | N/A |
| `configuration-path` | The path to the label configuration file | `.github/pr-size-labeler.yml` |
