'use strict'

import assert from 'node:assert'
import { mock, test } from 'node:test'
import esmock from 'esmock'

const mockResponse = {
  id: '123abc',
  environment: 'preview',
  latest_stage: {
    name: 'deploy',
    status: 'initialized'
  }
}

test('waitForDeployment() should wait until a deployment is successful - wait', async () => {
  const mockCloudflare = mock.fn(function () {
    return {
      pages: {
        projects: {
          deployments: {
            get: mock.fn(async () => mockResponse)
          }
        }
      }
    }
  })

  const checkDeploymentStatus = await esmock(
    '../src/cloudflare-statuscheck.js',
    {
      '../src/cloudflare-client.js': {
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
    id: '123abc',
    environment: 'preview',
    latest_stage: {
      name: 'deploy',
      status: 'success'
    }
  }

  const mockCloudflare = mock.fn(function () {
    return {
      pages: {
        projects: {
          deployments: {
            get: mock.fn(async () => successResponse)
          }
        }
      }
    }
  })

  const checkDeploymentStatus = await esmock(
    '../src/cloudflare-statuscheck.js',
    {
      '../src/cloudflare-client.js': {
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
    id: '123abc',
    environment: 'preview',
    latest_stage: {
      name: 'deploy',
      status: 'failure'
    }
  }

  const mockSetFailed = mock.fn()
  const mockCloudflare = mock.fn(function () {
    return {
      pages: {
        projects: {
          deployments: {
            get: mock.fn(async () => failureResponse)
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
      '../src/cloudflare-client.js': {
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

test('waitForDeployment() should handle SDK errors gracefully', async () => {
  const mockSetFailed = mock.fn()
  const mockCloudflare = mock.fn(function () {
    return {
      pages: {
        projects: {
          deployments: {
            get: mock.fn(async () => {
              throw new Error('API authentication failed')
            })
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
      '../src/cloudflare-client.js': {
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
    message: 'Failed to fetch deployment status: API authentication failed'
  })

  assert.equal(mockSetFailed.mock.calls.length, 1)
})

test('waitForDeployment() should abort when the response has no deployment', async () => {
  const mockSetFailed = mock.fn()
  const mockCloudflare = mock.fn(function () {
    return {
      pages: {
        projects: {
          deployments: {
            get: mock.fn(async () => ({}))
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
      '../src/cloudflare-client.js': {
        default: mockCloudflare
      }
    }
  )

  await assert.rejects(
    checkDeploymentStatus(
      '123xyz',
      'zentered',
      'user@example.com',
      'cf-project',
      '123abc'
    ),
    {
      message: 'Failed to fetch deployment status: No build id. Abort.'
    }
  )

  assert.ok(mockSetFailed.mock.calls.length >= 1)
  assert.equal(
    mockSetFailed.mock.calls[0].arguments[0],
    'no build with this ID found.'
  )
})
