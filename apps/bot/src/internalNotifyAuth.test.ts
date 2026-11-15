import { createHmac } from 'node:crypto'
import { describe, expect, it } from 'vitest'
import { verifyInternalNotifySignature } from './internalNotifyAuth.js'

const token = 'x'.repeat(32)
const rawBody = JSON.stringify({ event: 'paid', order: 'R123' })
const nowSec = 1_800_000_000

const signatureFor = (timestamp: number, body = rawBody): string =>
  createHmac('sha256', token).update(`${timestamp}.${body}`).digest('hex')

describe('verifyInternalNotifySignature', () => {
  it('accepts a valid HMAC signature within the allowed timestamp skew', () => {
    const timestamp = String(nowSec)
    const signature = signatureFor(nowSec)

    expect(verifyInternalNotifySignature(timestamp, signature, rawBody, token, nowSec)).toBe(true)
  })

  it('rejects a timestamp older than five minutes', () => {
    const timestamp = nowSec - 301
    const signature = signatureFor(timestamp)

    expect(verifyInternalNotifySignature(String(timestamp), signature, rawBody, token, nowSec)).toBe(false)
  })

  it('rejects missing headers', () => {
    const signature = signatureFor(nowSec)

    expect(verifyInternalNotifySignature(undefined, signature, rawBody, token, nowSec)).toBe(false)
    expect(verifyInternalNotifySignature(String(nowSec), undefined, rawBody, token, nowSec)).toBe(false)
  })

  it('rejects malformed timestamps', () => {
    const signature = signatureFor(nowSec)

    expect(verifyInternalNotifySignature('not-a-time', signature, rawBody, token, nowSec)).toBe(false)
  })

  it('rejects signatures for a tampered body', () => {
    const signature = signatureFor(nowSec, JSON.stringify({ event: 'paid' }))

    expect(verifyInternalNotifySignature(String(nowSec), signature, rawBody, token, nowSec)).toBe(false)
  })

  it('rejects length-mismatched signatures before constant-time comparison', () => {
    expect(verifyInternalNotifySignature(String(nowSec), 'short', rawBody, token, nowSec)).toBe(false)
  })
})
