import sanitizeHtml from 'sanitize-html'

const ALLOWED_TAGS = ['p', 'br', 'strong', 'b', 'em', 'i', 'ul', 'ol', 'li', 'h3', 'h4', 'blockquote', 'a']

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function decodeEntities(text: string): string {
  return text
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
}

/**
 * Convert plain text with blank-line paragraphs and "- " / "* " bullet lines
 * into simple HTML.
 */
function plainTextToHtml(text: string): string {
  const blocks = text.trim().split(/\n\s*\n/)
  return blocks
    .map((block) => {
      const lines = block.split('\n').map((l) => l.trim()).filter(Boolean)
      const isList = lines.length > 0 && lines.every((l) => /^[-*•]\s+/.test(l))
      if (isList) {
        const items = lines.map((l) => `<li>${escapeHtml(l.replace(/^[-*•]\s+/, ''))}</li>`)
        return `<ul>${items.join('')}</ul>`
      }
      return `<p>${lines.map(escapeHtml).join('<br>')}</p>`
    })
    .join('')
}

/**
 * Normalise a stored product description into safe HTML for the storefront.
 *
 * Handles three shapes found in the DB:
 * - Plain text (seeded products) → paragraphs/lists
 * - Text pasted into Tiptap that became a code block (`<pre><code>…`) → unwrapped, then paragraphs/lists
 * - Normal Tiptap HTML → sanitised
 */
export function productDescriptionHtml(description: string | null | undefined): string {
  if (!description) return ''
  let source = description.trim()

  const codeBlock = source.match(/^<pre>\s*<code[^>]*>([\s\S]*?)<\/code>\s*<\/pre>$/i)
  if (codeBlock) {
    source = plainTextToHtml(decodeEntities(codeBlock[1]))
  } else if (!/<[a-z][\s\S]*>/i.test(source)) {
    source = plainTextToHtml(source)
  }

  return sanitizeHtml(source, {
    allowedTags: ALLOWED_TAGS,
    allowedAttributes: { a: ['href', 'target', 'rel'] },
    transformTags: {
      a: sanitizeHtml.simpleTransform('a', { target: '_blank', rel: 'noopener noreferrer' }),
    },
  })
}

/** Plain-text version for meta descriptions and JSON-LD. */
export function productDescriptionText(description: string | null | undefined): string {
  const html = productDescriptionHtml(description)
  const text = sanitizeHtml(html.replace(/<\/(p|li|h3|h4)>/g, ' ').replace(/<br\s*\/?>/g, ' '), {
    allowedTags: [],
    allowedAttributes: {},
  })
  return decodeEntities(text).replace(/\s+/g, ' ').trim()
}
