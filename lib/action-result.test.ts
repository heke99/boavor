import { describe, expect, it } from 'vitest'
import { actionError, actionOk } from './action-result'

describe('action result helpers', () => {
  it('creates success results', () => {
    expect(actionOk('Sparat', { id: '1' })).toEqual({ ok: true, message: 'Sparat', data: { id: '1' } })
  })

  it('creates error results with field errors', () => {
    expect(actionError('Fel', { email: 'Ogiltig e-post' })).toEqual({
      ok: false,
      message: 'Fel',
      fieldErrors: { email: 'Ogiltig e-post' },
    })
  })
})
