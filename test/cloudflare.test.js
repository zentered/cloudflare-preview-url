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
          url: 'https://123.cf-project.pages.dev',
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
    'fix/test-1'
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
      'fix/test-1'
    )
  ).rejects.toThrow()
})

test('getDeploymentUrl() should fail if there are no matching builds', async () => {
  const data = {
    data: {
      result: [
        {
          name: 'zentered-co',
          url: 'test-123.cloudflare.app',
          meta: {
            githubCommitRef: 'does-not-exist',
            githubCommitRepo: 'zentered'
          }
        }
      ]
    }
  }
  axios.get.mockResolvedValueOnce(data)

  await expect(
    getDeploymentUrl('123xyz', 'zentered', 'fix/huge-bug', 'zentered.co')
  ).rejects.toThrow()
})
