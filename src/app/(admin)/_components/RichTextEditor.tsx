'use client'

import { useRef, useState, type ReactNode } from 'react'
import { useEditor, EditorContent, type Editor } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Link from '@tiptap/extension-link'
import Image from '@tiptap/extension-image'
import Placeholder from '@tiptap/extension-placeholder'
import { useUploadThing } from '@/lib/uploadthing'

/**
 * - `basic`   product descriptions / about sections: section heading, bold, italic, bullets
 * - `faq`     basic + links + numbered lists
 * - `article` full blog toolset: H2/H3, quote, divider, links, inline images, undo/redo
 */
type EditorVariant = 'basic' | 'faq' | 'article'

interface RichTextEditorProps {
  value: string
  onChange: (html: string) => void
  variant?: EditorVariant
  placeholder?: string
  /** Light (storefront-style) canvas so long-form writing reads like the live page */
  canvas?: 'dark' | 'light'
}

export function RichTextEditor({
  value,
  onChange,
  variant = 'basic',
  placeholder,
  canvas = 'dark',
}: RichTextEditorProps) {
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: { levels: variant === 'article' ? [2, 3] : [3] },
        codeBlock: false,
        code: false,
        ...(variant === 'article' ? {} : { blockquote: false, horizontalRule: false }),
      }),
      ...(variant === 'basic'
        ? []
        : [Link.configure({ openOnClick: false, autolink: true, HTMLAttributes: { rel: null, target: null } })]),
      ...(variant === 'article' ? [Image.configure({ inline: false })] : []),
      Placeholder.configure({ placeholder: placeholder ?? 'Start writing…' }),
    ],
    content: value,
    immediatelyRender: false,
    editorProps: {
      attributes: {
        class: canvas === 'light' ? `tl-prose${variant === 'article' ? ' tl-prose--article' : ''}` : '',
      },
    },
    onUpdate: ({ editor }) => {
      onChange(editor.isEmpty ? '' : editor.getHTML())
    },
  })

  if (!editor) {
    return <div className="h-40 rounded-lg border border-stone-700 bg-stone-800/60 animate-pulse" aria-hidden="true" />
  }

  const isArticle = variant === 'article'
  const allowLinks = variant !== 'basic'

  const canvasClasses =
    canvas === 'light'
      ? 'bg-stone text-charcoal [&_.ProseMirror]:min-h-[420px] [&_.ProseMirror]:px-6 [&_.ProseMirror]:py-6 md:[&_.ProseMirror]:px-10'
      : 'bg-stone-800 text-white text-sm [&_.ProseMirror]:min-h-[140px] [&_.ProseMirror]:px-3 [&_.ProseMirror]:py-2 [&_.ProseMirror_ul]:list-disc [&_.ProseMirror_ul]:pl-5 [&_.ProseMirror_ol]:list-decimal [&_.ProseMirror_ol]:pl-5 [&_.ProseMirror_p]:my-1 [&_.ProseMirror_h3]:text-xs [&_.ProseMirror_h3]:font-semibold [&_.ProseMirror_h3]:uppercase [&_.ProseMirror_h3]:tracking-wide [&_.ProseMirror_h3]:text-gold-light [&_.ProseMirror_h3]:mt-3 [&_.ProseMirror_h3]:mb-1 [&_.ProseMirror_a]:underline [&_.ProseMirror_a]:text-gold-light'

  return (
    <div className="rounded-lg border border-stone-600 overflow-hidden focus-within:ring-2 focus-within:ring-gold">
      <div
        role="toolbar"
        aria-label="Formatting"
        className="sticky top-14 lg:top-0 z-10 flex flex-wrap items-center gap-0.5 px-2 py-1.5 bg-stone-700 border-b border-stone-600"
      >
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
            <ImageButton editor={editor} />
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

      <EditorContent
        editor={editor}
        className={`${canvasClasses} [&_.ProseMirror]:outline-none [&_.ProseMirror_p.is-editor-empty:first-child::before]:content-[attr(data-placeholder)] [&_.ProseMirror_p.is-editor-empty:first-child::before]:float-left [&_.ProseMirror_p.is-editor-empty:first-child::before]:h-0 [&_.ProseMirror_p.is-editor-empty:first-child::before]:pointer-events-none [&_.ProseMirror_p.is-editor-empty:first-child::before]:opacity-40 [&_.ProseMirror_img.ProseMirror-selectednode]:ring-2 [&_.ProseMirror_img.ProseMirror-selectednode]:ring-gold`}
      />
    </div>
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
      const normalised = /^(https?:|mailto:|tel:|\/|#)/i.test(url) ? url : `https://${url}`
      editor.chain().focus().extendMarkRange('link').setLink({ href: normalised }).run()
    }
    setOpen(false)
  }

  return (
    <span className="relative">
      <ToolButton label="Link" active={editor.isActive('link')} onClick={openPopover}>
        <Icon d="M10 14a4 4 0 005.66 0l3-3a4 4 0 00-5.66-5.66l-1 1M14 10a4 4 0 00-5.66 0l-3 3a4 4 0 005.66 5.66l1-1" />
      </ToolButton>
      {open && (
        <div className="absolute left-0 top-full mt-2 z-20 w-72 rounded-lg bg-stone-900 ring-1 ring-stone-600 shadow-xl p-3 space-y-2">
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

function ImageButton({ editor }: { editor: Editor }) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [busy, setBusy] = useState(false)
  const { startUpload } = useUploadThing('contentImages')

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setBusy(true)
    try {
      const res = await startUpload([file])
      const url = res?.[0]?.ufsUrl
      if (url) {
        const alt = window.prompt('Describe this image for screen readers and Google (alt text):', '') ?? ''
        editor.chain().focus().setImage({ src: url, alt }).run()
      }
    } catch (err) {
      window.alert(`Image upload failed: ${err instanceof Error ? err.message : 'unknown error'}`)
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
      <input ref={inputRef} type="file" accept="image/*" className="hidden" onChange={onFile} />
    </>
  )
}
