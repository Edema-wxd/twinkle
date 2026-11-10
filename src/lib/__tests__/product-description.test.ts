import { describe, it, expect } from 'vitest'
import { productDescriptionHtml, productDescriptionText } from '../product-description'

describe('productDescriptionHtml', () => {
  it('unwraps text pasted into a Tiptap code block', () => {
    const html = productDescriptionHtml(
      '<pre><code>Gold beads, handcrafted.\n\n- Sizes: 2mm, 4mm\n- Packs: 50, 100\n\nNot sure? Message us.</code></pre>',
    )
    expect(html).toBe(
      '<p>Gold beads, handcrafted.</p><ul><li>Sizes: 2mm, 4mm</li><li>Packs: 50, 100</li></ul><p>Not sure? Message us.</p>',
    )
  })

  it('converts plain text to paragraphs', () => {
    expect(productDescriptionHtml('Lustrous beads — signature piece.')).toBe('<p>Lustrous beads — signature piece.</p>')
  })

  it('keeps normal Tiptap HTML and strips unsafe markup', () => {
    expect(productDescriptionHtml('<p>Hi <strong>there</strong></p><script>alert(1)</script>')).toBe(
      '<p>Hi <strong>there</strong></p>',
    )
  })

  it('escapes HTML-like text inside code blocks', () => {
    expect(productDescriptionHtml('<pre><code>a &lt;b&gt; c</code></pre>')).toBe('<p>a &lt;b&gt; c</p>')
  })

  it('handles empty input', () => {
    expect(productDescriptionHtml('')).toBe('')
  })
})

describe('productDescriptionText', () => {
  it('produces clean text for meta tags', () => {
    expect(productDescriptionText('<pre><code>Gold beads.\n\n- Sizes: 2mm\n- Packs: 50</code></pre>')).toBe(
      'Gold beads. Sizes: 2mm Packs: 50',
    )
  })
})
