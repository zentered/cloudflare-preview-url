'use strict'

import assert from 'node:assert'
import { mock, test } from 'node:test'
// eslint-disable-next-line node/no-unpublished-import
import esmock from 'esmock'

const payload = {
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
}

test('waitForDeployment() should wait until a deployment is successful - wait', async () => {
  const mockFetch = mock.fn(async () => {
    return payload
  })

  const checkDeploymentStatus = await esmock(
    '../src/cloudflare-statuscheck.js',
    {
      import: {
        fetch: async () => ({
          status: 200,
          json: mockFetch
        })
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
  const mockFetch = mock.fn(async () => {
    payload.data.result[0].latest_stage.status = 'success'
    return payload
  })

  const checkDeploymentStatus = await esmock(
    '../src/cloudflare-statuscheck.js',
    {
      import: {
        fetch: async () => ({
          status: 200,
          json: mockFetch
        })
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
  const mockFetch = mock.fn(async () => {
    payload.data.result[0].latest_stage.status = 'failure'
    return payload
  })
  const mockSetFailed = mock.fn()

  const checkDeploymentStatus = await esmock(
    '../src/cloudflare-statuscheck.js',
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

  const fn = checkDeploymentStatus(
    '123xyz',
    'zentered',
    'user@example.com',
    'cf-project',
    '123abc'
  )

  await assert.rejects(fn, {
    name: 'Error',
    message: 'Build failed. Abort.'
  })

  assert.equal(mockSetFailed.mock.calls.length, 1)
})
