import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderNewsletter, newsletterHtmlToText, absoluteUrl, UNSUBSCRIBE_PLACEHOLDER } from '@/lib/newsletter/template'
import { parseNewsletterContent } from '@/lib/newsletter/campaign'

vi.mock('@/db', () => ({ db: {} }))
vi.mock('@/lib/newsletter/send', () => ({ sendNewsletterEmail: vi.fn() }))

beforeEach(() => vi.stubEnv('NEXT_PUBLIC_SITE_URL', 'https://twinklelocs.com'))

const content = {
  subject: 'New gold beads, {name}',
  preheader: 'Fresh drop this week',
  heroImageUrl: 'https://ta1u3ge9om.ufs.sh/f/hero.jpg',
  bodyHtml: '<p>Hi {name}, our <strong>gold</strong> beads are back. <a href="https://twinklelocs.com/catalog">Shop now</a></p><ul><li>4mm</li><li>6mm</li></ul>',
  ctaLabel: 'Shop gold',
  ctaUrl: '/catalog/gold-twinkles',
}

describe('renderNewsletter', () => {
  it('personalises the subject and body with the first name', () => {
    const r = renderNewsletter(content, 'Ada')
    expect(r.subject).toBe('New gold beads, Ada')
    expect(r.html).toContain('Hi Ada,')
    expect(r.text).toContain('Hi Ada,')
  })

  it('falls back to "there" without a name', () => {
    expect(renderNewsletter(content, '').subject).toBe('New gold beads, there')
  })

  it('has a slot for the unsubscribe link in both parts', () => {
    const r = renderNewsletter(content, 'Ada')
    expect(r.html).toContain(`href="${UNSUBSCRIBE_PLACEHOLDER}"`)
    expect(r.text).toContain(`Unsubscribe: ${UNSUBSCRIBE_PLACEHOLDER}`)
  })

  it('makes the button link absolute and inlines styles email apps need', () => {
    const r = renderNewsletter(content, 'Ada')
    expect(r.html).toContain('href="https://twinklelocs.com/catalog/gold-twinkles"')
    expect(r.html).toMatch(/<p style="margin:0 0 16px 0;[^"]*">Hi Ada/)
    expect(r.html).toContain('Fresh drop this week')
    expect(r.html).toContain('src="https://ta1u3ge9om.ufs.sh/f/hero.jpg"')
  })

  it('drops a non-https hero image', () => {
    expect(renderNewsletter({ ...content, heroImageUrl: 'http://evil.example/x.jpg' }, 'Ada').html).not.toContain('evil.example')
  })
})

describe('plain text', () => {
  it('keeps links and bullets readable', () => {
    const t = newsletterHtmlToText('<p>See <a href="https://x.com/a">our range</a></p><ul><li>One</li><li>Two</li></ul>')
    expect(t).toContain('See our range (https://x.com/a)')
    expect(t).toContain('• One')
    expect(t).toContain('• Two')
  })
})

describe('absoluteUrl', () => {
  it.each([
    ['/catalog', 'https://twinklelocs.com/catalog'],
    ['https://instagram.com/twinklelocs', 'https://instagram.com/twinklelocs'],
    ['twinklelocs.com/blog', 'https://twinklelocs.com/blog'],
    ['javascript:alert(1)', null],
    ['', null],
  ])('%s → %s', (input, out) => expect(absoluteUrl(input)).toBe(out))
})

describe('parseNewsletterContent', () => {
  it('cleans the body (no scripts or event handlers)', () => {
    const r = parseNewsletterContent({ subject: 'Hi', bodyHtml: '<p onclick="x()">Hello</p><script>alert(1)</script><img src="javascript:x">' })
    expect('content' in r && r.content.bodyHtml).toBe('<p>Hello</p>')
  })

  it.each([
    [{ subject: '', bodyHtml: '<p>Hi</p>' }, /subject/],
    [{ subject: 'Hi', bodyHtml: '<p> </p>' }, /Write/],
    [{ subject: 'Hi', bodyHtml: '<p>Hi</p>', ctaLabel: 'Shop', ctaUrl: 'javascript:alert(1)' }, /link/],
  ])('refuses incomplete content', (raw, err) => {
    const r = parseNewsletterContent(raw)
    expect('error' in r && r.error).toMatch(err)
  })
})
