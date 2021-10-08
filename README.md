# Cloudflare Preview URL

![Test](https://github.com/zentered/cloudflare-preview-url/workflows/Test/badge.svg)
![Release](https://github.com/zentered/cloudflare-preview-url/workflows/Publish/badge.svg)
![Semantic Release](https://github.com/govolition/storefront-api/workflows/Semantic%20Release/badge.svg)
[![Conventional Commits](https://img.shields.io/badge/Conventional%20Commits-1.0.0-yellow.svg)](https://conventionalcommits.org)

Retrieve the preview URL from the Cloudflare API, filtered by the repo and branch. The URL can then be used for further end-to-end tests, link checks and other PR integrations/actions.

## Table of Contents

- [Usage](#usage)
- [Environment Variables](#environment-variables--secret)
- [Inputs](#inputs)
- [Outputs](#outputs)

## Usage

[Copy your "Global API Key"](https://dash.cloudflare.com/profile/api-tokens)

Cloudflare needs a little time to build the preview, you can check the average build time in your deployments and add the seconds plus a little to a `sleep` action, to wait until the deployment is ready. The action only works on branches, so make sure you exclude the `main` branch from the trigger:

```yaml
on:
  push:
    branches:
      - '**'
      - '!main'
```

Here are the steps for an example job:

```yaml
- run: sleep 30
- name: cloudflare-preview-url
  uses: zentered/cloudflare-preview-url@v1.0.0
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

We recommend to set a timeout for this action, if something goes wrong with the build, the Action should stop after 10 minutes:

```yaml
runs-on: ubuntu-latest
timeout-minutes: 10
```

## Environment Variables / Secret

In the repository, go to "Settings", then "Secrets" and add "CLOUDFLARE_API_TOKEN", the value you can retrieve on your [Cloudflare account](https://dash.cloudflare.com/profile/api-tokens). You also need to add:

- `CLOUDFLARE_ACCOUNT_EMAIL` (your login email)
- `CLOUDFLARE_ACCOUNT_ID` (from the URL: `https://dash.cloudflare.com/123abc....`)

## Inputs

| Name                    | Requirement | Description                                                                                                                     |
| ----------------------- | ----------- | ------------------------------------------------------------------------------------------------------------------------------- |
| `cloudflare_project_id` | required    | Cloudflare project id/name                                                                                                      |
| `wait_until_ready`      | optional    | Wait until the Cloudflare deployment is ready, defaults to "false"                                                              |
| `environment`           | optional    | Which Cloudflare deployment environments to allow. If set to null, doesn't filter deploys by environment. Defaults to "preview" |
| `commit_hash`           | optional    | Optional commit hash to filter deployments on. Useful when the same branch can have multiple deploys.                           |

## Outputs

| Name          | Description                                                                                                             |
| ------------- | ----------------------------------------------------------------------------------------------------------------------- |
| `preview_url` | A string with the unique URL of the deployment. If it hasn't finished uploading (is incomplete), the value will be null |

## Contributing

See [CONTRIBUTING](CONTRIBUTING.md).

## License

See [LICENSE](LICENSE).
