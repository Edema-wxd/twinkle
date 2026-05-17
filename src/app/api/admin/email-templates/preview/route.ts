import { NextRequest, NextResponse } from 'next/server'
import { getAdminSession } from '@/lib/auth/server'

const WHATSAPP_URL = 'https://wa.me/2349118888010'
const SUPPORT_EMAIL = 'hello@twinklelocs.com'
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://twinklelocs.com'

const REVIEW_KEYS = ['delivered', 'review_reminder']

function esc(v: string): string {
  return v
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;')
}

function buildPreviewHtml(params: {
  bannerColor: string
  bannerLabel: string
  body: string
  templateKey: string
}): string {
  const { bannerColor, bannerLabel, body, templateKey } = params

  const showTracking = templateKey === 'shipped'
  const showReview = REVIEW_KEYS.includes(templateKey)
  const reviewUrl = `${SITE_URL}/review?ref=PREVIEW`

  const trackingRow = showTracking
    ? `<tr>
        <td style="padding-top:12px;border-top:1px solid #e7e5e4;">
          <div style="font-size:11px;color:#78716c;text-transform:uppercase;letter-spacing:0.07em;margin-bottom:4px;">Tracking number</div>
          <div style="font-family:Menlo,Monaco,'Courier New',monospace;font-size:14px;color:#1c1917;font-weight:600;">NG-PREVIEW-12345</div>
        </td>
      </tr>`
    : ''

  const itemsTable = `<tr>
    <td style="padding-top:20px;">
      <div style="font-size:11px;color:#78716c;text-transform:uppercase;letter-spacing:0.07em;margin-bottom:8px;">Order items</div>
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
        <tr>
          <td style="padding:8px 0;border-bottom:1px solid #f0efee;vertical-align:top;">
            <div style="font-size:13px;color:#1c1917;font-weight:600;">Wooden Loc Beads</div>
            <div style="font-size:12px;color:#78716c;margin-top:1px;">Natural Brown &times; 2</div>
          </td>
          <td style="padding:8px 0 8px 8px;border-bottom:1px solid #f0efee;text-align:right;vertical-align:top;font-size:13px;color:#1c1917;">&#8358;10,000</td>
        </tr>
      </table>
    </td>
  </tr>`

  const reviewSection = showReview
    ? `<table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color:#fafaf9;border:1px solid #e7e5e4;border-radius:6px;margin-top:24px;">
        <tr>
          <td style="padding:20px 24px;text-align:center;">
            <div style="font-size:15px;color:#1c1917;font-weight:600;margin-bottom:6px;">Loved your order?</div>
            <div style="font-size:13px;color:#78716c;margin-bottom:16px;">A quick review helps other loc lovers discover us.</div>
            <a href="${reviewUrl}" style="display:inline-block;background-color:#d4a843;color:#ffffff;font-size:13px;font-weight:600;padding:10px 28px;border-radius:6px;text-decoration:none;letter-spacing:0.02em;">Leave a Review &rarr;</a>
          </td>
        </tr>
      </table>`
    : ''

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1.0">
</head>
<body style="margin:0;padding:0;background-color:#f5f5f4;font-family:ui-sans-serif,system-ui,-apple-system,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
    <tr>
      <td style="padding:40px 16px;">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="max-width:560px;margin:0 auto;">
          <tr>
            <td style="background-color:#1c1917;border-radius:8px 8px 0 0;padding:24px 32px;">
              <div style="font-size:20px;font-weight:700;color:#d4a843;letter-spacing:0.1em;text-transform:uppercase;">Twinkle Locs</div>
              <div style="font-size:11px;color:#a8a29e;margin-top:3px;letter-spacing:0.03em;">loc bead accessories</div>
            </td>
          </tr>
          <tr>
            <td style="background-color:${esc(bannerColor)};padding:12px 32px;">
              <span style="font-size:13px;font-weight:600;color:#ffffff;letter-spacing:0.02em;">${esc(bannerLabel)}</span>
            </td>
          </tr>
          <tr>
            <td style="background-color:#ffffff;padding:32px;">
              <p style="margin:0 0 16px 0;font-size:16px;color:#1c1917;font-weight:600;">Hi Amaka,</p>
              <p style="margin:0 0 28px 0;font-size:15px;color:#44403c;line-height:1.7;">${esc(body)}</p>

              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color:#fafaf9;border:1px solid #e7e5e4;border-radius:6px;margin-bottom:24px;">
                <tr>
                  <td style="padding:20px 24px;">
                    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
                      <tr>
                        <td style="padding-bottom:12px;">
                          <div style="font-size:11px;color:#78716c;text-transform:uppercase;letter-spacing:0.07em;margin-bottom:4px;">Order reference</div>
                          <div style="font-family:Menlo,Monaco,'Courier New',monospace;font-size:15px;color:#1c1917;font-weight:600;">#PREVIEW001</div>
                        </td>
                      </tr>
                      <tr>
                        <td style="padding-top:12px;border-top:1px solid #e7e5e4;">
                          <div style="font-size:11px;color:#78716c;text-transform:uppercase;letter-spacing:0.07em;margin-bottom:4px;">Order total</div>
                          <div style="font-size:17px;color:#1c1917;font-weight:700;">&#8358;12,500</div>
                        </td>
                      </tr>
                      ${itemsTable}
                      ${trackingRow}
                    </table>
                  </td>
                </tr>
              </table>

              ${reviewSection}

              <p style="margin:${showReview ? '24px' : '0'} 0 0 0;font-size:13px;color:#78716c;line-height:1.7;">
                Have a question? Reply to this email or reach us on
                <a href="${WHATSAPP_URL}" style="color:#d4a843;text-decoration:none;font-weight:500;">WhatsApp</a>.
              </p>
            </td>
          </tr>
          <tr>
            <td style="background-color:#f5f5f4;border:1px solid #e7e5e4;border-top:none;border-radius:0 0 8px 8px;padding:16px 32px;text-align:center;">
              <p style="margin:0;font-size:11px;color:#a8a29e;">© 2025 Twinkle Locs &nbsp;·&nbsp; <a href="mailto:${SUPPORT_EMAIL}" style="color:#a8a29e;text-decoration:none;">${SUPPORT_EMAIL}</a></p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`
}

export async function POST(req: NextRequest) {
  const session = await getAdminSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const { templateKey, bannerColor, bannerLabel, body: templateBody } = body as Record<string, unknown>

  if (
    typeof templateKey !== 'string' ||
    typeof bannerColor !== 'string' ||
    typeof bannerLabel !== 'string' ||
    typeof templateBody !== 'string'
  ) {
    return NextResponse.json({ error: 'templateKey, bannerColor, bannerLabel, body are required' }, { status: 400 })
  }

  const html = buildPreviewHtml({ bannerColor, bannerLabel, body: templateBody, templateKey })
  return NextResponse.json({ html })
}
