/* eslint-disable node/no-unsupported-features/es-syntax */
import checkDeploymentStatus from '../cloudflare-statuscheck.mjs'
import axios from 'axios'

jest.mock('@actions/core', () => {
  return {
    info: jest.fn(),
    setFailed: jest.fn()
  }
})
jest.mock('axios')

test('waitForDeployment() should wait until a deployment is successful', async () => {
  axios.get.mockResolvedValueOnce({
    data: {
      result: [
        {
          id: '123abc',
          environment: 'preview',
          latest_stage: {
            name: 'deploy',
            status: 'initialized'
          }
        }
      ]
    }
  })

  axios.get.mockResolvedValueOnce({
    data: {
      result: [
        {
          id: '123abc',
          environment: 'preview',
          latest_stage: {
            name: 'deploy',
            status: 'success'
          }
        }
      ]
    }
  })

  const firstCheck = await checkDeploymentStatus(
    '123xyz',
    'zentered',
    'user@example.com',
    'cf-project',
    '123abc'
  )

  const secondCheck = await checkDeploymentStatus(
    '123xyz',
    'zentered',
    'user@example.com',
    'cf-project',
    '123abc'
  )
  expect(firstCheck).toEqual(false)
  expect(secondCheck).toEqual(true)
})

test('waitForDeployment() should abort when a build has failed', async () => {
  axios.get.mockResolvedValueOnce({
    data: {
      result: [
        {
          id: '123abc',
          environment: 'preview',
          latest_stage: {
            name: 'build',
            status: 'failure'
          }
        }
      ]
    }
  })

  await expect(
    checkDeploymentStatus(
      '123xyz',
      'zentered',
      'user@example.com',
      'cf-project',
      '123abc'
    )
  ).rejects.toThrow('Build failed. Abort.')
})
