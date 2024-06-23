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
on:
  push:
    branches:
      - '**'
      - '!main'
# Add a sleep action to wait until the deployment is ready
- run: sleep 30
- name: cloudflare-preview-url
# Use the latest version
  uses: zentered/cloudflare-preview-url@v1.4.2
  id: cloudflare_preview_url
  env:
    CLOUDFLARE_API_TOKEN: ${{ secrets.CLOUDFLARE_API_TOKEN }}
    CLOUDFLARE_ACCOUNT_EMAIL: ${{ secrets.CLOUDFLARE_ACCOUNT_EMAIL }}
    CLOUDFLARE_ACCOUNT_ID: ${{ secrets.CLOUDFLARE_ACCOUNT_ID }}
  with:
    cloudflare_project_id: 'repo-name'
    wait_until_ready: true
- name: Get URL
  run: echo "https://${{ steps.cloudflare_preview_url.outputs.preview_url }}"
```

We recommend setting a timeout for this action, if something goes wrong with the
build, the Action should stop after 10 minutes:

```yaml
runs-on: ubuntu-latest
timeout-minutes: 10
```

## Environment Variables / Secrets

In the repository, go to "Settings", then "Secrets" and add
`CLOUDFLARE_API_TOKEN`, the value you can retrieve on your
[Cloudflare account](https://dash.cloudflare.com/profile/api-tokens). You also
need to add:

- `CLOUDFLARE_ACCOUNT_ID` (from the URL:
  `https://dash.cloudflare.com/123abc....`)
- [optional] `CLOUDFLARE_ACCOUNT_EMAIL` (your login email)

When providing an account email address, the token will not be used as `Bearer`
token.

## Inputs

| Name                    | Requirement | Description                                                                                                                     |
| ----------------------- | ----------- | ------------------------------------------------------------------------------------------------------------------------------- |
| `cloudflare_project_id` | required    | Cloudflare project id/name                                                                                                      |
| `wait_until_ready`      | optional    | Wait until the Cloudflare deployment is ready, defaults to "false"                                                              |
| `environment`           | optional    | Which Cloudflare deployment environments to allow. If set to null, doesn't filter deploys by environment. Defaults to "preview" |
| `commit_hash`           | optional    | Optional commit hash to filter deployments on. Useful when the same branch can have multiple deploys.                           |
| `branch`                | optional    | Optional branch name to filter deployments on. Useful when the branch name is not available in the action context.              |

## Outputs

| Name          | Description                                                                                                             |
| ------------- | ----------------------------------------------------------------------------------------------------------------------- |
| `preview_url` | A string with the unique URL of the deployment. If it hasn't finished uploading (is incomplete), the value will be null |

## Contributing

See [CONTRIBUTING](CONTRIBUTING.md).

## License

See [LICENSE](LICENSE).
