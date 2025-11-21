# Cloudflare Preview URL

![Test](https://github.com/zentered/cloudflare-preview-url/workflows/Test/badge.svg)
![Release](https://github.com/zentered/cloudflare-preview-url/workflows/Publish/badge.svg)
[![semantic-release: conventional](https://img.shields.io/badge/semantic--release-conventional-e10079?logo=semantic-release)](https://github.com/semantic-release/semantic-release)
[![Conventional Commits](https://img.shields.io/badge/Conventional%20Commits-1.0.0-yellow.svg)](https://conventionalcommits.org)

Retrieve the preview/deployment URL from the Cloudflare API, filtered by the
repository and branch. The URL can then be used for further end-to-end tests,
link checks and other PR integrations/actions.

## Usage

### API Token (recommended)

Navigate to the
[Cloudflare API Tokens](https://dash.cloudflare.com/profile/api-tokens) page and
create a new token with the following permissions:

- Account - Cloudflare Pages - Read
- Include - [your page]

Copy the token and add it to your repository secrets as `CLOUDFLARE_API_TOKEN`.

### Global API Key

[Copy your "Global API Key"](https://dash.cloudflare.com/profile/api-tokens) -
this also requires the Account Email to be set.

### Workflow template

```yaml
name: Cloudflare Preview URL
on:
  push:
    branches:
      - '**'
      - '!main'

jobs:
  test:
    runs-on: ubuntu-latest
    timeout-minutes: 10
    steps:
      - uses: actions/checkout@v4

      # Optional: Add a sleep action to wait until the deployment is ready
      # or use wait_until_ready: true below
      - run: sleep 30

      - name: Get Cloudflare Preview URL
        uses: zentered/cloudflare-preview-url@v1
        id: cloudflare_preview_url
        env:
          CLOUDFLARE_API_TOKEN: ${{ secrets.CLOUDFLARE_API_TOKEN }}
          CLOUDFLARE_ACCOUNT_ID: ${{ secrets.CLOUDFLARE_ACCOUNT_ID }}
        with:
          cloudflare_project_id: 'your-project-name'
          wait_until_ready: true

      - name: Use Preview URL
        run: echo "Preview URL: ${{ steps.cloudflare_preview_url.outputs.preview_url }}"
```

## Environment Variables / Secrets

In your repository, go to "Settings" → "Secrets and variables" → "Actions" and
add the following secrets:

### Required Secrets

- **`CLOUDFLARE_API_TOKEN`** - Your Cloudflare API token (see
  [API Token setup](#api-token-recommended) above)
- **`CLOUDFLARE_ACCOUNT_ID`** - Your Cloudflare Account ID (find it in the URL:
  `https://dash.cloudflare.com/[account-id]/...`)

### Optional Secrets

- **`CLOUDFLARE_ACCOUNT_EMAIL`** - Your Cloudflare account email address

**Note:** When providing `CLOUDFLARE_ACCOUNT_EMAIL`, the action will use API Key
authentication instead of Bearer token authentication. This is required if
you're using a Global API Key instead of an API Token.

## Inputs

| Name                    | Requirement  | Default     | Description                                                                                                   |
| ----------------------- | ------------ | ----------- | ------------------------------------------------------------------------------------------------------------- |
| `cloudflare_project_id` | **required** | -           | Cloudflare Pages project name (found in your Cloudflare Pages dashboard)                                      |
| `wait_until_ready`      | optional     | `false`     | Wait until the Cloudflare deployment is ready before returning the URL                                        |
| `environment`           | optional     | `preview`   | Filter by deployment environment (`preview` or `production`). Set to empty string to include all environments |
| `commit_hash`           | optional     | -           | Filter deployments by commit hash. Useful when the same branch has multiple deployments                       |
| `branch`                | optional     | auto-detect | Override branch name for filtering. By default, uses the branch from the GitHub context                       |

## Outputs

| Name          | Description                                                                                                            |
| ------------- | ---------------------------------------------------------------------------------------------------------------------- |
| `preview_url` | A string with the unique URL of the deployment. Always set when a deployment is found, regardless of deployment status |

## Example Use Cases

- **End-to-end Testing**: Use the preview URL to run automated tests against
  your deployment
- **Visual Regression Testing**: Integrate with tools like Percy, Chromatic, or
  BackstopJS
- **Link Checking**: Validate that all links work in your preview deployment
- **Performance Testing**: Run Lighthouse or other performance audits
- **Notifications**: Comment the preview URL on pull requests or send to Slack

## Compatibility

This action uses the official
[Cloudflare TypeScript SDK v5](https://github.com/cloudflare/cloudflare-typescript)
and is compatible with:

- Node.js 20+
- Cloudflare Pages API v4
- Both API Token (recommended) and Global API Key authentication

## Contributing

See [CONTRIBUTING](CONTRIBUTING.md).

## License

See [LICENSE](LICENSE).
