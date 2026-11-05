'use strict'

import assert from 'node:assert'
import { mock, test } from 'node:test'
import esmock from 'esmock'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

function readFixture(name) {
  const path = join('test', 'fixtures', `${name}.json`)
  const file = readFileSync(path, 'utf8')
  return JSON.parse(file)
}

// Mimics the SDK's PagePromise: an async iterable over every deployment.
function listOf(name) {
  const { result } = readFixture(name)
  return {
    async *[Symbol.asyncIterator]() {
      yield* result
    }
  }
}

test('getDeploymentUrl() should return a Cloudflare build', async () => {
  const mockCloudflare = mock.fn(function () {
    return {
      pages: {
        projects: {
          deployments: {
            list: mock.fn(() => listOf('success'))
          }
        }
      }
    }
  })

  const getDeploymentUrl = await esmock('../src/cloudflare.js', {
    '../src/cloudflare-client.js': {
      default: mockCloudflare
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

  assert.equal(url, 'https://123.cf-project.pages.dev')
})

test('getDeploymentUrl() should fail if there are no deployments', async () => {
  const mockSetFailed = mock.fn()
  const mockCloudflare = mock.fn(function () {
    return {
      pages: {
        projects: {
          deployments: {
            list: mock.fn(() => listOf('empty'))
          }
        }
      }
    }
  })

  const getDeploymentUrl = await esmock('../src/cloudflare.js', {
    '@actions/core': {
      info: mock.fn(),
      debug: mock.fn(),
      error: mock.fn(),
      setFailed: mockSetFailed
    },
    '../src/cloudflare-client.js': {
      default: mockCloudflare
    }
  })

  const fn = getDeploymentUrl(
    '123xyz',
    'zentered',
    'user@example.com',
    'cf-project',
    'website',
    'fix/test-1',
    'preview',
    null
  )

  await assert.rejects(fn, {
    name: 'Error',
    message: 'Error fetching deployments: no deployments found'
  })

  assert.equal(mockSetFailed.mock.calls.length, 2)
})

test('getDeploymentUrl() should check all environments when null', async () => {
  const mockCloudflare = mock.fn(function () {
    return {
      pages: {
        projects: {
          deployments: {
            list: mock.fn(() => listOf('check-environments'))
          }
        }
      }
    }
  })

  const getDeploymentUrl = await esmock('../src/cloudflare.js', {
    '../src/cloudflare-client.js': {
      default: mockCloudflare
    }
  })

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

  assert.equal(url, 'https://main.cf-project.pages.dev')
})

test('getDeploymentUrl() should filter by commitHash when provided', async () => {
  const mockCloudflare = mock.fn(function () {
    return {
      pages: {
        projects: {
          deployments: {
            list: mock.fn(() => listOf('filter-by-commithash'))
          }
        }
      }
    }
  })

  const getDeploymentUrl = await esmock('../src/cloudflare.js', {
    '../src/cloudflare-client.js': {
      default: mockCloudflare
    }
  })

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

  assert.equal(url, 'https://main-456.cf-project.pages.dev')
})

test('getDeploymentUrl() should fail if there are no matching builds', async () => {
  const mockSetFailed = mock.fn()
  const mockCloudflare = mock.fn(function () {
    return {
      pages: {
        projects: {
          deployments: {
            list: mock.fn(() => listOf('filter-by-commithash'))
          }
        }
      }
    }
  })

  const getDeploymentUrl = await esmock('../src/cloudflare.js', {
    '@actions/core': {
      info: mock.fn(),
      debug: mock.fn(),
      error: mock.fn(),
      setFailed: mockSetFailed
    },
    '../src/cloudflare-client.js': {
      default: mockCloudflare
    }
  })

  const fn = getDeploymentUrl(
    '123xyz',
    'zentered',
    'fix/huge-bug',
    'zentered.co',
    'preview',
    null
  )

  await assert.rejects(fn, {
    name: 'Error',
    message: 'Error fetching deployments: no matching builds found'
  })

  assert.equal(mockSetFailed.mock.calls.length, 2)
})

test('getDeploymentUrl() should handle SDK errors gracefully', async () => {
  const mockSetFailed = mock.fn()
  const mockCloudflare = mock.fn(function () {
    return {
      pages: {
        projects: {
          deployments: {
            list: mock.fn(() => ({
              // eslint-disable-next-line require-yield
              async *[Symbol.asyncIterator]() {
                throw new Error('Network timeout')
              }
            }))
          }
        }
      }
    }
  })

  const getDeploymentUrl = await esmock('../src/cloudflare.js', {
    '@actions/core': {
      info: mock.fn(),
      debug: mock.fn(),
      error: mock.fn(),
      setFailed: mockSetFailed
    },
    '../src/cloudflare-client.js': {
      default: mockCloudflare
    }
  })

  const fn = getDeploymentUrl(
    '123xyz',
    'zentered',
    'user@example.com',
    'cf-project',
    'website',
    'fix/test-1',
    'preview',
    null
  )

  await assert.rejects(fn, {
    name: 'Error',
    message: 'Error fetching deployments: Network timeout'
  })

  assert.equal(mockSetFailed.mock.calls.length, 1)
})

test('getDeploymentUrl() should skip deployments with null trigger metadata', async () => {
  const mockCloudflare = mock.fn(function () {
    return {
      pages: {
        projects: {
          deployments: {
            list: mock.fn(() => listOf('null-metadata'))
          }
        }
      }
    }
  })

  const getDeploymentUrl = await esmock('../src/cloudflare.js', {
    '../src/cloudflare-client.js': {
      default: mockCloudflare
    }
  })

  const { url } = await getDeploymentUrl(
    '123xyz',
    'zentered',
    undefined,
    'cf-project',
    'website',
    'fix/test-1',
    'preview',
    'abc'
  )

  assert.equal(url, 'https://123.cf-project.pages.dev')
})
