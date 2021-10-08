/* eslint-disable node/no-unsupported-features/es-syntax */
import getDeploymentUrl from '../cloudflare.mjs'
import axios from 'axios'

jest.mock('@actions/core', () => {
  return {
    info: jest.fn(),
    debug: jest.fn(),
    error: jest.fn()
  }
})
jest.mock('axios')

test('getDeploymentUrl() should return a Cloudflare build', async () => {
  axios.get.mockResolvedValueOnce({
    data: {
      result: [
        {
          environment: 'production',
          url: 'https://main.cf-project.pages.dev',
          deployment_trigger: {
            type: 'github:push',
            metadata: {
              branch: 'main'
            }
          },
          latest_stage: {
            name: 'deploy',
            status: 'success'
          },
          source: {
            type: 'github',
            config: {
              repo_name: 'website',
              production_branch: 'main'
            }
          }
        },
        {
          environment: 'preview',
          url: 'https://123.cf-project.pages.dev',
          deployment_trigger: {
            type: 'github:push',
            metadata: {
              branch: 'fix/test-1'
            }
          },
          latest_stage: {
            name: 'deploy',
            status: 'success'
          },
          source: {
            type: 'github',
            config: {
              repo_name: 'website'
            }
          }
        }
      ]
    }
  })

  const { url } = await getDeploymentUrl(
    '123xyz',
    'zentered',
    'user@example.com',
    'cf-project',
    'website',
    'fix/test-1',
    'preview',
    null
  )

  expect(url).toEqual('https://123.cf-project.pages.dev')
})

test('getDeploymentUrl() should fail if there are no deployments', async () => {
  const data = {
    data: {
      result: []
    }
  }
  axios.get.mockResolvedValueOnce(data)

  await expect(
    getDeploymentUrl(
      '123xyz',
      'zentered',
      'user@example.com',
      'cf-project',
      'website',
      'fix/test-1',
      'preview',
      null
    )
  ).rejects.toThrow()
})

test('getDeploymentUrl() should check all environments when null', async () => {
  const data = {
    data: {
      result: [
        {
          environment: 'production',
          url: 'https://main.cf-project.pages.dev',
          deployment_trigger: {
            type: 'github:push',
            metadata: {
              branch: 'main'
            }
          },
          latest_stage: {
            name: 'deploy',
            status: 'success'
          },
          source: {
            type: 'github',
            config: {
              repo_name: 'website',
              production_branch: 'main'
            }
          }
        },
        {
          environment: 'preview',
          url: 'https://123.cf-project.pages.dev',
          deployment_trigger: {
            type: 'github:push',
            metadata: {
              branch: 'fix/test-1'
            }
          },
          latest_stage: {
            name: 'deploy',
            status: 'success'
          },
          source: {
            type: 'github',
            config: {
              repo_name: 'website'
            }
          }
        }
      ]
    }
  }
  axios.get.mockResolvedValueOnce(data)

  const { url } = await getDeploymentUrl(
    '123xyz',
    'zentered',
    'user@example.com',
    'cf-project',
    'website',
    'main',
    null,
    null
  )

  expect(url).toEqual('https://main.cf-project.pages.dev')
})

test('getDeploymentUrl() should filter by commitHash when provided', async () => {
  const data = {
    data: {
      result: [
        {
          environment: 'production',
          url: 'https://main-123.cf-project.pages.dev',
          deployment_trigger: {
            type: 'github:push',
            metadata: {
              branch: 'main',
              commit_hash: '123'
            }
          },
          latest_stage: {
            name: 'deploy',
            status: 'success'
          },
          source: {
            type: 'github',
            config: {
              repo_name: 'website',
              production_branch: 'main'
            }
          }
        },
        {
          environment: 'production',
          url: 'https://main-456.cf-project.pages.dev',
          deployment_trigger: {
            type: 'github:push',
            metadata: {
              branch: 'main',
              commit_hash: '456'
            }
          },
          latest_stage: {
            name: 'deploy',
            status: 'success'
          },
          source: {
            type: 'github',
            config: {
              repo_name: 'website',
              production_branch: 'main'
            }
          }
        },
        {
          environment: 'preview',
          url: 'https://789.cf-project.pages.dev',
          deployment_trigger: {
            type: 'github:push',
            metadata: {
              branch: 'fix/test-1',
              commit_hash: '789'
            }
          },
          latest_stage: {
            name: 'deploy',
            status: 'success'
          },
          source: {
            type: 'github',
            config: {
              repo_name: 'website'
            }
          }
        }
      ]
    }
  }
  axios.get.mockResolvedValueOnce(data)

  const { url } = await getDeploymentUrl(
    '123xyz',
    'zentered',
    'user@example.com',
    'cf-project',
    'website',
    'main',
    null,
    '456'
  )

  expect(url).toEqual('https://main-456.cf-project.pages.dev')
})

test('getDeploymentUrl() should fail if there are no matching builds', async () => {
  const data = {
    data: {
      result: [
        {
          name: 'zentered-co',
          url: 'test-123.cloudflare.app',
          deployment_trigger: {
            type: 'github:push',
            metadata: {
              branch: 'test-123',
              commit_hash: '456'
            }
          },
          meta: {
            githubCommitRef: 'does-not-exist',
            githubCommitRepo: 'zentered'
          },
          source: {
            type: 'github',
            config: {
              repo_name: 'website'
            }
          }
        }
      ]
    }
  }
  axios.get.mockResolvedValueOnce(data)

  await expect(
    getDeploymentUrl(
      '123xyz',
      'zentered',
      'fix/huge-bug',
      'zentered.co',
      'preview',
      null
    )
  ).rejects.toThrow('no matching builds found')
})
