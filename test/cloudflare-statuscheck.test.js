'use strict'

import assert from 'node:assert'
import { mock, test } from 'node:test'
import esmock from 'esmock'

const mockResponse = {
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

test('waitForDeployment() should wait until a deployment is successful - wait', async () => {
  const mockCloudflare = mock.fn(function () {
    return {
      pages: {
        projects: {
          deployments: {
            list: mock.fn(async () => mockResponse)
          }
        }
      }
    }
  })

  const checkDeploymentStatus = await esmock(
    '../src/cloudflare-statuscheck.js',
    {
      cloudflare: {
        default: mockCloudflare
      }
    }
  )

  const actual = await checkDeploymentStatus(
    '123xyz',
    'zentered',
    'user@example.com',
    'cf-project',
    '123abc'
  )

  assert.equal(actual, false)
})

test('waitForDeployment() should wait until a deployment is successful - done', async () => {
  const successResponse = {
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

  const mockCloudflare = mock.fn(function () {
    return {
      pages: {
        projects: {
          deployments: {
            list: mock.fn(async () => successResponse)
          }
        }
      }
    }
  })

  const checkDeploymentStatus = await esmock(
    '../src/cloudflare-statuscheck.js',
    {
      cloudflare: {
        default: mockCloudflare
      }
    }
  )

  const actual = await checkDeploymentStatus(
    '123xyz',
    'zentered',
    'user@example.com',
    'cf-project',
    '123abc'
  )

  assert.equal(actual, true)
})

test('waitForDeployment() should abort when a build has failed', async () => {
  const failureResponse = {
    result: [
      {
        id: '123abc',
        environment: 'preview',
        latest_stage: {
          name: 'deploy',
          status: 'failure'
        }
      }
    ]
  }

  const mockSetFailed = mock.fn()
  const mockCloudflare = mock.fn(function () {
    return {
      pages: {
        projects: {
          deployments: {
            list: mock.fn(async () => failureResponse)
          }
        }
      }
    }
  })

  const checkDeploymentStatus = await esmock(
    '../src/cloudflare-statuscheck.js',
    {
      '@actions/core': {
        info: mock.fn(),
        debug: mock.fn(),
        error: mock.fn(),
        setFailed: mockSetFailed
      },
      cloudflare: {
        default: mockCloudflare
      }
    }
  )

  const fn = checkDeploymentStatus(
    '123xyz',
    'zentered',
    'user@example.com',
    'cf-project',
    '123abc'
  )

  await assert.rejects(fn, {
    name: 'Error',
    message: 'Failed to fetch deployment status: Build failed. Abort.'
  })

  assert.equal(mockSetFailed.mock.calls.length, 2)
})
