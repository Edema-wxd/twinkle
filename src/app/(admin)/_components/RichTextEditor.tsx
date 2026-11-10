'use client'

import { useEffect, useRef, useState, type ReactNode } from 'react'
import { useEditor, EditorContent, type Editor } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Link from '@tiptap/extension-link'
import Image from '@tiptap/extension-image'
import Placeholder from '@tiptap/extension-placeholder'
import Table from '@tiptap/extension-table'
import TableRow from '@tiptap/extension-table-row'
import TableHeader from '@tiptap/extension-table-header'
import TableCell from '@tiptap/extension-table-cell'
import { useUploadThing } from '@/lib/uploadthing'
import {
  hasForeignImages,
  isPresentationalHtml,
  looksLikeMarkdown,
  markdownToArticle,
  rehostImagesInHtml,
  rehostViaApi,
  type MarkdownImportResult,
} from '@/lib/markdown-import'

/**
 * - `basic`   product descriptions / about sections: section heading, bold, italic, bullets
 * - `faq`     basic + links + numbered lists
 * - `article` full blog toolset: H2/H3, quote, divider, links, images, tables, Markdown paste/drop
 */
type EditorVariant = 'basic' | 'faq' | 'article'

interface RichTextEditorProps {
  value: string
  onChange: (html: string) => void
  variant?: EditorVariant
  placeholder?: string
  /** Light (storefront-style) canvas so long-form writing reads like the live page */
  canvas?: 'dark' | 'light'
  /** Gives the parent imperative access (e.g. Markdown import replacing the body) */
  onReady?: (editor: Editor) => void
  /** A .md file was dropped into the editor: parent can fill title/teaser/etc. */
  onMarkdownImported?: (result: MarkdownImportResult) => void
}

type Notice = { tone: 'info' | 'warn' | 'error'; text: string } | null

export function RichTextEditor({
  value,
  onChange,
  variant = 'basic',
  placeholder,
  canvas = 'dark',
  onReady,
  onMarkdownImported,
}: RichTextEditorProps) {
  const isArticle = variant === 'article'
  const [notice, setNotice] = useState<Notice>(null)
  const noticeTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const { startUpload } = useUploadThing('blogImages', {
    onUploadError: (err) => flash({ tone: 'error', text: `Image upload failed: ${err.message}` }),
  })

  function flash(n: Notice, ms = 6000) {
    if (noticeTimer.current) clearTimeout(noticeTimer.current)
    setNotice(n)
    if (n && n.tone !== 'warn') noticeTimer.current = setTimeout(() => setNotice(null), ms)
  }

  // editorProps are captured once, so route paste/drop through refs to fresh callbacks
  type Handlers = {
    uploadImages: (files: File[]) => Promise<string[]>
    importMarkdown: (md: string, files: File[], at?: number) => Promise<void>
    pasteHtml: (html: string) => Promise<void>
  }
  const noop = async () => {}
  const handlers = useRef<Handlers>({ uploadImages: async () => [], importMarkdown: noop, pasteHtml: noop })

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: { levels: isArticle ? [2, 3] : [3] },
        codeBlock: false,
        code: false,
        ...(isArticle ? {} : { blockquote: false, horizontalRule: false }),
      }),
      ...(variant === 'basic'
        ? []
        : [Link.configure({ openOnClick: false, autolink: true, HTMLAttributes: { rel: null, target: null } })]),
      ...(isArticle
        ? [
            Image.configure({ inline: false }),
            Table.configure({ resizable: false, HTMLAttributes: { class: 'tl-table' } }),
            TableRow,
            TableHeader,
            TableCell,
          ]
        : []),
      Placeholder.configure({ placeholder: placeholder ?? 'Start writing…' }),
    ],
    content: value,
    immediatelyRender: false,
    editorProps: {
      attributes: {
        class: canvas === 'light' ? `tl-prose${isArticle ? ' tl-prose--article' : ''}` : '',
      },
      handlePaste: (_view, event) => {
        if (!isArticle) return false
        const dt = event.clipboardData
        if (!dt) return false
        const images = Array.from(dt.files).filter((f) => f.type.startsWith('image/'))
        if (images.length > 0) {
          void handlers.current.uploadImages(images).then((urls) => {
            for (const src of urls) editorRef.current?.chain().focus().setImage({ src, alt: '' }).run()
          })
          return true
        }
        const text = dt.getData('text/plain')
        const html = dt.getData('text/html')
        if (text && looksLikeMarkdown(text) && (!html || isPresentationalHtml(html))) {
          void handlers.current.importMarkdown(text, [])
          return true
        }
        if (html && hasForeignImages(html)) {
          void handlers.current.pasteHtml(html)
          return true
        }
        return false
      },
      handleDrop: (view, event, _slice, moved) => {
        if (!isArticle || moved) return false
        const files = Array.from(event.dataTransfer?.files ?? [])
        if (files.length === 0) return false
        const pos = view.posAtCoords({ left: event.clientX, top: event.clientY })?.pos
        const md = files.find((f) => /\.(md|markdown|mdown|txt)$/i.test(f.name))
        if (md) {
          void md.text().then((txt) => handlers.current.importMarkdown(txt, files, pos))
          return true
        }
        const images = files.filter((f) => f.type.startsWith('image/'))
        if (images.length === 0) return false
        void handlers.current.uploadImages(images).then((urls) => {
          const chain = editorRef.current?.chain().focus()
          if (!chain) return
          if (pos !== undefined) chain.setTextSelection(pos)
          urls.forEach((src) => chain.setImage({ src, alt: '' }))
          chain.run()
        })
        return true
      },
    },
    onUpdate: ({ editor }) => {
      onChange(editor.isEmpty ? '' : editor.getHTML())
    },
  })

  const editorRef = useRef<Editor | null>(null)
  editorRef.current = editor

  useEffect(() => {
    if (editor) onReady?.(editor)
  }, [editor, onReady])

  handlers.current = {
    uploadImages: async (files) => {
      flash({ tone: 'info', text: `Uploading ${files.length} image${files.length === 1 ? '' : 's'}…` }, 60_000)
      const res = await startUpload(files)
      const urls = (res ?? []).map((r) => r.ufsUrl)
      if (urls.length > 0) flash({ tone: 'info', text: 'Image added. Click it, then use "Describe image" to add alt text.' })
      return urls
    },
    importMarkdown: async (md, files, at) => {
      flash({ tone: 'info', text: 'Converting Markdown and copying images…' }, 120_000)
      const result = await markdownToArticle(md, {
        files,
        uploadLocal: async (file) => (await startUpload([file]))?.[0]?.ufsUrl ?? null,
        rehostRemote: rehostViaApi,
      })
      const ed = editorRef.current
      if (!ed) return
      const chain = ed.chain().focus()
      if (at !== undefined) chain.setTextSelection(at)
      chain.insertContent(result.html).run()
      onMarkdownImported?.(result)
      const bits = [
        `${result.stats.words.toLocaleString()} words`,
        result.stats.images ? `${result.stats.images} image${result.stats.images === 1 ? '' : 's'}` : null,
        result.stats.tables ? `${result.stats.tables} table${result.stats.tables === 1 ? '' : 's'}` : null,
        result.stats.links ? `${result.stats.links} link${result.stats.links === 1 ? '' : 's'}` : null,
      ].filter(Boolean)
      flash({ tone: 'info', text: `Imported ${bits.join(', ')}.${result.warnings.length && onMarkdownImported ? ' See the notes above the editor.' : result.warnings.length ? ' ' + result.warnings.join(' ') : ''}` }, 8000)
    },
    pasteHtml: async (html) => {
      flash({ tone: 'info', text: 'Copying pasted images to Twinkle Locs storage…' }, 60_000)
      const { html: clean, failed } = await rehostImagesInHtml(html)
      editorRef.current?.chain().focus().insertContent(clean).run()
      flash(
        failed
          ? { tone: 'warn', text: `${failed} image${failed === 1 ? '' : 's'} couldn't be copied and ${failed === 1 ? 'was' : 'were'} left out. Download and insert with the image button.` }
          : null,
      )
    },
  }

  if (!editor) {
    return <div className="h-40 rounded-lg border border-stone-700 bg-stone-800/60 animate-pulse" aria-hidden="true" />
  }

  const allowLinks = variant !== 'basic'
  const inTable = isArticle && editor.isActive('table')
  const imageSelected = isArticle && editor.isActive('image')

  const canvasClasses =
    canvas === 'light'
      ? 'bg-stone text-charcoal [&_.ProseMirror]:min-h-[420px] [&_.ProseMirror]:px-6 [&_.ProseMirror]:py-6 md:[&_.ProseMirror]:px-10'
      : 'bg-stone-800 text-white text-sm [&_.ProseMirror]:min-h-[140px] [&_.ProseMirror]:px-3 [&_.ProseMirror]:py-2 [&_.ProseMirror_ul]:list-disc [&_.ProseMirror_ul]:pl-5 [&_.ProseMirror_ol]:list-decimal [&_.ProseMirror_ol]:pl-5 [&_.ProseMirror_p]:my-1 [&_.ProseMirror_h3]:text-xs [&_.ProseMirror_h3]:font-semibold [&_.ProseMirror_h3]:uppercase [&_.ProseMirror_h3]:tracking-wide [&_.ProseMirror_h3]:text-gold-light [&_.ProseMirror_h3]:mt-3 [&_.ProseMirror_h3]:mb-1 [&_.ProseMirror_a]:underline [&_.ProseMirror_a]:text-gold-light'

  return (
    // overflow-clip (not hidden) so the sticky toolbar still sticks to the viewport
    <div className="rounded-lg border border-stone-600 overflow-clip focus-within:ring-2 focus-within:ring-gold">
      <div
        role="toolbar"
        aria-label="Formatting"
        style={{ top: 'var(--editor-sticky-top, var(--admin-header-h, 0px))' }}
        className="sticky z-10 bg-stone-700 border-b border-stone-600"
      >
        <div className="flex flex-wrap items-center gap-0.5 px-2 py-1.5">
          {isArticle && (
            <ToolButton label="Heading" active={editor.isActive('heading', { level: 2 })} onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}>
              <span className="font-bold">H2</span>
            </ToolButton>
          )}
          <ToolButton
            label={isArticle ? 'Small caps label' : 'Section heading'}
            active={editor.isActive('heading', { level: 3 })}
            onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
          >
            <span className="font-semibold">{isArticle ? 'H3' : 'H'}</span>
          </ToolButton>
          <Divider />
          <ToolButton label="Bold" active={editor.isActive('bold')} onClick={() => editor.chain().focus().toggleBold().run()}>
            <span className="font-bold">B</span>
          </ToolButton>
          <ToolButton label="Italic" active={editor.isActive('italic')} onClick={() => editor.chain().focus().toggleItalic().run()}>
            <span className="italic font-serif">I</span>
          </ToolButton>
          {allowLinks && <LinkButton editor={editor} />}
          <Divider />
          <ToolButton label="Bullet list" active={editor.isActive('bulletList')} onClick={() => editor.chain().focus().toggleBulletList().run()}>
            <Icon d="M9 6h11M9 12h11M9 18h11M4.5 6h.01M4.5 12h.01M4.5 18h.01" />
          </ToolButton>
          {allowLinks && (
            <ToolButton label="Numbered list" active={editor.isActive('orderedList')} onClick={() => editor.chain().focus().toggleOrderedList().run()}>
              <Icon d="M10 6h10M10 12h10M10 18h10M4 5h1v3M4 11.5h1.5L4 14h1.5M4 17h1.5v3H4" />
            </ToolButton>
          )}
          {isArticle && (
            <>
              <ToolButton label="Pull quote" active={editor.isActive('blockquote')} onClick={() => editor.chain().focus().toggleBlockquote().run()}>
                <Icon d="M7 7h4v4c0 3-1.5 5-4 6M15 7h4v4c0 3-1.5 5-4 6" />
              </ToolButton>
              <ToolButton label="Bead divider" onClick={() => editor.chain().focus().setHorizontalRule().run()}>
                <Icon d="M4 12h.01M12 12h.01M20 12h.01" strokeWidth={4} />
              </ToolButton>
              <ImageButton upload={handlers.current.uploadImages} editor={editor} />
              <ToolButton
                label="Insert table"
                active={inTable}
                onClick={() => editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()}
              >
                <Icon d="M4 5h16v14H4zM4 10h16M4 15h16M10 5v14M15 5v14" />
              </ToolButton>
              <span className="ml-auto flex items-center gap-0.5">
                <ToolButton label="Undo" disabled={!editor.can().undo()} onClick={() => editor.chain().focus().undo().run()}>
                  <Icon d="M9 14L4 9l5-5M4 9h10a6 6 0 010 12h-3" />
                </ToolButton>
                <ToolButton label="Redo" disabled={!editor.can().redo()} onClick={() => editor.chain().focus().redo().run()}>
                  <Icon d="M15 14l5-5-5-5M20 9H10a6 6 0 000 12h3" />
                </ToolButton>
              </span>
            </>
          )}
        </div>

        {/* Contextual table controls */}
        {inTable && (
          <div className="flex flex-wrap items-center gap-1 px-2 py-1.5 border-t border-stone-600 bg-stone-800 text-xs">
            <span className="text-stone-400 mr-1">Table:</span>
            <TableAction onClick={() => editor.chain().focus().addRowAfter().run()}>+ Row</TableAction>
            <TableAction onClick={() => editor.chain().focus().addColumnAfter().run()}>+ Column</TableAction>
            <TableAction onClick={() => editor.chain().focus().deleteRow().run()}>− Row</TableAction>
            <TableAction onClick={() => editor.chain().focus().deleteColumn().run()}>− Column</TableAction>
            <TableAction onClick={() => editor.chain().focus().toggleHeaderRow().run()}>Header row</TableAction>
            <TableAction onClick={() => editor.chain().focus().mergeOrSplit().run()}>Merge / split</TableAction>
            <TableAction danger onClick={() => editor.chain().focus().deleteTable().run()}>Delete table</TableAction>
          </div>
        )}

        {/* Contextual image controls */}
        {imageSelected && (
          <div className="flex flex-wrap items-center gap-1 px-2 py-1.5 border-t border-stone-600 bg-stone-800 text-xs">
            <span className="text-stone-400 mr-1">Image:</span>
            <TableAction
              onClick={() => {
                const current = (editor.getAttributes('image').alt as string | undefined) ?? ''
                const alt = window.prompt('Describe this image for screen readers and Google:', current)
                if (alt !== null) editor.chain().focus().updateAttributes('image', { alt: alt.trim() }).run()
              }}
            >
              {editor.getAttributes('image').alt ? 'Edit description' : 'Describe image (alt text)'}
            </TableAction>
            <TableAction danger onClick={() => editor.chain().focus().deleteSelection().run()}>Remove image</TableAction>
          </div>
        )}

        {notice && (
          <div
            role={notice.tone === 'error' ? 'alert' : 'status'}
            className={`flex items-start gap-2 px-3 py-2 border-t text-xs ${
              notice.tone === 'error'
                ? 'bg-red-950 border-red-800 text-red-200'
                : notice.tone === 'warn'
                  ? 'bg-amber-950 border-amber-800 text-amber-100'
                  : 'bg-stone-800 border-stone-600 text-stone-200'
            }`}
          >
            <span className="flex-1">{notice.text}</span>
            <button type="button" onClick={() => setNotice(null)} aria-label="Dismiss" className="px-1 text-stone-400 hover:text-white">
              &times;
            </button>
          </div>
        )}
      </div>

      <EditorContent
        editor={editor}
        className={`${canvasClasses} [&_.ProseMirror]:outline-none [&_.ProseMirror_p.is-editor-empty:first-child::before]:content-[attr(data-placeholder)] [&_.ProseMirror_p.is-editor-empty:first-child::before]:float-left [&_.ProseMirror_p.is-editor-empty:first-child::before]:h-0 [&_.ProseMirror_p.is-editor-empty:first-child::before]:pointer-events-none [&_.ProseMirror_p.is-editor-empty:first-child::before]:opacity-40 [&_.ProseMirror_img.ProseMirror-selectednode]:ring-2 [&_.ProseMirror_img.ProseMirror-selectednode]:ring-gold [&_.ProseMirror_.selectedCell]:bg-gold/15`}
      />
    </div>
  )
}

function TableAction({ onClick, children, danger = false }: { onClick: () => void; children: ReactNode; danger?: boolean }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`min-h-8 px-2.5 rounded-md transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold-light ${
        danger ? 'text-red-300 hover:bg-red-950' : 'text-stone-200 hover:bg-stone-600'
      }`}
    >
      {children}
    </button>
  )
}

function ToolButton({
  label,
  active = false,
  disabled = false,
  onClick,
  children,
}: {
  label: string
  active?: boolean
  disabled?: boolean
  onClick: () => void
  children: ReactNode
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      aria-pressed={active}
      title={label}
      className={`min-w-9 h-9 px-2 inline-flex items-center justify-center text-sm rounded-md transition-colors disabled:opacity-30 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold-light ${
        active ? 'bg-gold text-white' : 'text-stone-300 hover:bg-stone-600 hover:text-white'
      }`}
    >
      {children}
    </button>
  )
}

function Divider() {
  return <span className="mx-1 h-5 w-px bg-stone-600" aria-hidden="true" />
}

function Icon({ d, strokeWidth = 2 }: { d: string; strokeWidth?: number }) {
  return (
    <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d={d} />
    </svg>
  )
}

function LinkButton({ editor }: { editor: Editor }) {
  const [open, setOpen] = useState(false)
  const [href, setHref] = useState('')

  function openPopover() {
    setHref((editor.getAttributes('link').href as string | undefined) ?? '')
    setOpen(true)
  }

  function apply() {
    const url = href.trim()
    if (!url) {
      editor.chain().focus().extendMarkRange('link').unsetLink().run()
    } else {
      const normalised = /^(https?:|mailto:|tel:|\/|#)/i.test(url)
        ? url
        : /^[^/.]+\//.test(url) || !url.split('/')[0].includes('.')
          ? `/${url}` // "catalog/gold-beads" → internal link
          : `https://${url}`
      const { empty } = editor.state.selection
      if (empty && !editor.isActive('link')) {
        // Nothing selected: insert the address itself as linked text
        editor.chain().focus().insertContent({ type: 'text', text: url, marks: [{ type: 'link', attrs: { href: normalised } }] }).run()
      } else {
        editor.chain().focus().extendMarkRange('link').setLink({ href: normalised }).run()
      }
    }
    setOpen(false)
  }

  return (
    <span className="relative">
      <ToolButton label="Link" active={editor.isActive('link')} onClick={openPopover}>
        <Icon d="M10 14a4 4 0 005.66 0l3-3a4 4 0 00-5.66-5.66l-1 1M14 10a4 4 0 00-5.66 0l-3 3a4 4 0 005.66 5.66l1-1" />
      </ToolButton>
      {open && (
        <div className="absolute left-0 top-full mt-2 z-20 w-72 max-w-[calc(100vw-3rem)] rounded-lg bg-stone-900 ring-1 ring-stone-600 shadow-xl p-3 space-y-2">
          <label className="block text-xs text-stone-400" htmlFor="rte-link">
            Link to a product (/catalog/…), post (/blog/…) or any website
          </label>
          <input
            id="rte-link"
            autoFocus
            value={href}
            onChange={(e) => setHref(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') { e.preventDefault(); apply() }
              if (e.key === 'Escape') { e.preventDefault(); setOpen(false) }
            }}
            placeholder="/catalog/gold-beads"
            className="w-full px-2.5 py-1.5 bg-stone-800 border border-stone-600 text-white placeholder-stone-500 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-gold"
          />
          <div className="flex justify-end gap-2">
            {editor.isActive('link') && (
              <button type="button" onClick={() => { setHref(''); editor.chain().focus().extendMarkRange('link').unsetLink().run(); setOpen(false) }} className="px-2.5 py-1 text-xs text-red-300 hover:text-red-200">
                Remove
              </button>
            )}
            <button type="button" onClick={() => setOpen(false)} className="px-2.5 py-1 text-xs text-stone-400 hover:text-white">
              Cancel
            </button>
            <button type="button" onClick={apply} className="px-3 py-1 text-xs font-medium bg-gold text-white rounded-md hover:bg-gold-deep">
              Apply
            </button>
          </div>
        </div>
      )}
    </span>
  )
}

function ImageButton({ editor, upload }: { editor: Editor; upload: (files: File[]) => Promise<string[]> }) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [busy, setBusy] = useState(false)

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? [])
    if (files.length === 0) return
    setBusy(true)
    try {
      const urls = await upload(files)
      for (const src of urls) editor.chain().focus().setImage({ src, alt: '' }).run()
    } finally {
      setBusy(false)
      if (inputRef.current) inputRef.current.value = ''
    }
  }

  return (
    <>
      <ToolButton label={busy ? 'Uploading image…' : 'Insert image'} disabled={busy} onClick={() => inputRef.current?.click()}>
        {busy ? (
          <span className="w-4 h-4 rounded-full border-2 border-stone-400 border-t-transparent animate-spin" aria-hidden="true" />
        ) : (
          <Icon d="M4 5h16v14H4zM4 15l4-4 4 4 3-3 5 5M15 9h.01" />
        )}
      </ToolButton>
      <input ref={inputRef} type="file" accept="image/*" multiple className="hidden" onChange={onFile} />
    </>
  )
}
