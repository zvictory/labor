import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { Bot } from 'grammy'
import type { LaborContext } from '../middleware/session.js'

// Hoisted by Vitest before notify.ts is loaded, so ALLOWED_CHANNEL_IDS is
// built with the mocked adminChatId rather than throwing on missing BOT_TOKEN.
vi.mock('../config.js', () => ({
  config: { adminChatId: 'admin-chat-123' },
}))

vi.mock('../logger.js', () => ({
  logger: { warn: vi.fn(), error: vi.fn() },
}))

vi.mock('../i18n.js', () => ({
  t: vi.fn(),
}))

import { notifyChannel } from './notify.js'

const sendMessage = vi.fn()
const mockBot = { api: { sendMessage } } as unknown as Bot<LaborContext>

describe('notifyChannel allowlist guard (Fix 5)', () => {
  beforeEach(() => {
    sendMessage.mockReset()
    sendMessage.mockResolvedValue({})
  })

  it('rejects unlisted chat_id — no bot.api.sendMessage call', async () => {
    const result = await notifyChannel(mockBot, { chat_id: 'evil-chat', text: 'hi' })
    expect(result).toEqual({ ok: false, error: 'chat_id not in allowlist' })
    expect(sendMessage).not.toHaveBeenCalled()
  })

  it('allows the configured adminChatId', async () => {
    const result = await notifyChannel(mockBot, { chat_id: 'admin-chat-123', text: 'hello' })
    expect(result).toEqual({ ok: true })
    expect(sendMessage).toHaveBeenCalledOnce()
    expect(sendMessage).toHaveBeenCalledWith('admin-chat-123', 'hello', expect.any(Object))
  })

  it('rejects missing chat_id', async () => {
    const result = await notifyChannel(mockBot, { text: 'hello' })
    expect(result).toEqual({ ok: false, error: 'missing chat_id or text' })
    expect(sendMessage).not.toHaveBeenCalled()
  })

  it('rejects missing text', async () => {
    const result = await notifyChannel(mockBot, { chat_id: 'admin-chat-123' })
    expect(result).toEqual({ ok: false, error: 'missing chat_id or text' })
    expect(sendMessage).not.toHaveBeenCalled()
  })
})
