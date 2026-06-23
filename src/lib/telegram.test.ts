import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const ENV = process.env

describe('telegram transport', () => {
  beforeEach(() => {
    process.env = { ...ENV }
    vi.restoreAllMocks()
  })
  afterEach(() => {
    process.env = ENV
  })

  it('no-op (fetch tidak dipanggil) saat env kosong', async () => {
    delete process.env.TELEGRAM_BOT_TOKEN
    delete process.env.TELEGRAM_CHAT_ID
    const fetchSpy = vi.spyOn(globalThis, 'fetch')
    const { sendMessage } = await import('@/lib/telegram')
    await sendMessage('halo')
    expect(fetchSpy).not.toHaveBeenCalled()
  })

  it('sendMessage POST ke endpoint benar saat env terisi', async () => {
    process.env.TELEGRAM_BOT_TOKEN = 'TOKEN'
    process.env.TELEGRAM_CHAT_ID = '-100'
    const fetchSpy = vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValue(new Response('{}', { status: 200 }))
    const { sendMessage } = await import('@/lib/telegram')
    await sendMessage('halo dunia')
    expect(fetchSpy).toHaveBeenCalledTimes(1)
    const [url, init] = fetchSpy.mock.calls[0] as [string, RequestInit]
    expect(url).toContain('/botTOKEN/sendMessage')
    expect(JSON.parse(init.body as string)).toMatchObject({
      chat_id: '-100',
      text: 'halo dunia',
      parse_mode: 'HTML',
    })
  })

  it('menelan error jaringan tanpa throw', async () => {
    process.env.TELEGRAM_BOT_TOKEN = 'TOKEN'
    process.env.TELEGRAM_CHAT_ID = '-100'
    vi.spyOn(globalThis, 'fetch').mockRejectedValue(new Error('network down'))
    const { sendMessage } = await import('@/lib/telegram')
    await expect(sendMessage('x')).resolves.toBeUndefined()
  })
})
