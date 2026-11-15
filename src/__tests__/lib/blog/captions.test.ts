import { describe, it, expect } from 'vitest'
import { captionImages } from '@/lib/blog/captions'
import { sanitizeArticleHtml } from '@/lib/content'

describe('image captions', () => {
  it('turns an image with a caption into a figure', () => {
    expect(captionImages('<img src="https://x/a.jpg" alt="Beads" title="Gold 4mm on black thread" />')).toBe(
      '<figure><img src="https://x/a.jpg" alt="Beads" /><figcaption>Gold 4mm on black thread</figcaption></figure>',
    )
  })

  it('leaves images without a caption, and existing figures, alone', () => {
    expect(captionImages('<img src="https://x/a.jpg" alt="" />')).toBe('<img src="https://x/a.jpg" alt="" />')
    const fig = '<figure><img src="https://x/a.jpg" title="t" /><figcaption>t</figcaption></figure>'
    expect(captionImages(fig)).toBe(fig)
  })

  it('works on the sanitised page HTML, and a caption can’t inject markup', () => {
    const out = sanitizeArticleHtml('<p>Hi</p><img src="https://x/a.jpg" alt="Beads" title="&lt;script&gt;bad&lt;/script&gt; caption">', { forDisplay: true })
    expect(out).toContain('<figure><img src="https://x/a.jpg" alt="Beads"')
    expect(out).toContain('<figcaption>&lt;script&gt;bad&lt;/script&gt; caption</figcaption></figure>')
    expect(out).not.toContain('<script>')
  })
})
