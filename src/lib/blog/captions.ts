/**
 * Image captions: the editor stores a caption in the image's title attribute
 * (Markdown's ![alt](src "caption") does the same). On the page, an image with
 * a caption becomes <figure><img><figcaption>caption</figcaption></figure>.
 * Pure string work (no sanitiser) so the admin preview can use it too; the
 * input must already be sanitised HTML.
 */
export function captionImages(html: string): string {
  return html.replace(/(<figure[^>]*>\s*)?(<img\b[^>]*?)\s+title="([^"]*)"([^>]*>)/gi, (match, inFigure: string | undefined, start: string, caption: string, end: string) => {
    if (inFigure || !caption.trim()) return match
    // The caption is shown, so drop the hover tooltip that would repeat it
    return `<figure>${start}${end}<figcaption>${caption}</figcaption></figure>`
  })
}
