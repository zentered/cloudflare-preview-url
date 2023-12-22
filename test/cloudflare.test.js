'use strict'

import assert from 'node:assert'
import { mock, test } from 'node:test'
// eslint-disable-next-line node/no-unpublished-import
import esmock from 'esmock'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

async function readFixture(name) {
  const path = join('test', 'fixtures', `${name}.json`)
  const file = readFileSync(path, 'utf8')
  const data = JSON.parse(file)
  return Promise.resolve(data)
}

test('getDeploymentUrl() should return a Cloudflare build', async () => {
  const mockFetch = mock.fn(async () => readFixture('success'))
  const getDeploymentUrl = await esmock('../src/cloudflare.js', {
    import: {
      fetch: async () => ({
        status: 200,
        json: mockFetch
      })
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
  const mockFetch = mock.fn(async () => readFixture('empty'))
  const mockSetFailed = mock.fn()

  const getDeploymentUrl = await esmock(
    '../src/cloudflare.js',
    {
      '@actions/core': {
        info: mock.fn(),
        error: mock.fn(),
        setFailed: mockSetFailed
      }
    },
    {
      import: {
        fetch: async () => ({
          status: 200,
          json: mockFetch
        })
      }
    }
  )

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
    message: 'no deployments found'
  })

  assert.equal(mockSetFailed.mock.calls.length, 1)
})

test('getDeploymentUrl() should check all environments when null', async () => {
  const mockFetch = mock.fn(async () => readFixture('check-environments'))
  const getDeploymentUrl = await esmock('../src/cloudflare.js', {
    import: {
      fetch: async () => ({
        status: 200,
        json: mockFetch
      })
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
  const mockFetch = mock.fn(async () => readFixture('filter-by-commithash'))
  const getDeploymentUrl = await esmock('../src/cloudflare.js', {
    import: {
      fetch: async () => ({
        status: 200,
        json: mockFetch
      })
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
  const mockFetch = mock.fn(async () => readFixture('filter-by-commithash'))
  const mockSetFailed = mock.fn()
  const getDeploymentUrl = await esmock(
    '../src/cloudflare.js',
    {
      '@actions/core': {
        info: mock.fn(),
        error: mock.fn(),
        setFailed: mockSetFailed
      }
    },
    {
      import: {
        fetch: async () => ({
          status: 200,
          json: mockFetch
        })
      }
    }
  )

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
    message: 'no matching builds found'
  })

  assert.equal(mockSetFailed.mock.calls.length, 1)
})
