'use client'

import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'

interface RichTextEditorProps {
  value: string
  onChange: (html: string) => void
}

export function RichTextEditor({ value, onChange }: RichTextEditorProps) {
  const editor = useEditor({
    extensions: [StarterKit],
    content: value,
    immediatelyRender: false,
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML())
    },
  })

  if (!editor) return null

  return (
    <div className="rounded-lg border border-stone-600 overflow-hidden">
      {/* Toolbar */}
      <div className="flex items-center gap-1 px-2 py-1.5 bg-stone-700 border-b border-stone-600">
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleBold().run()}
          aria-label="Bold"
          className={`px-2 py-1 text-sm font-bold rounded transition-colors ${
            editor.isActive('bold')
              ? 'bg-gold text-white'
              : 'text-stone-300 hover:bg-stone-600 hover:text-white'
          }`}
        >
          B
        </button>
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleItalic().run()}
          aria-label="Italic"
          className={`px-2 py-1 text-sm italic rounded transition-colors ${
            editor.isActive('italic')
              ? 'bg-gold text-white'
              : 'text-stone-300 hover:bg-stone-600 hover:text-white'
          }`}
        >
          I
        </button>
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleBulletList().run()}
          aria-label="Bullet list"
          className={`px-2 py-1 text-sm rounded transition-colors ${
            editor.isActive('bulletList')
              ? 'bg-gold text-white'
              : 'text-stone-300 hover:bg-stone-600 hover:text-white'
          }`}
        >
          &#8226; List
        </button>
      </div>

      {/* Editor content */}
      <EditorContent
        editor={editor}
        className="bg-stone-800 text-white text-sm [&_.ProseMirror]:min-h-[120px] [&_.ProseMirror]:px-3 [&_.ProseMirror]:py-2 [&_.ProseMirror]:outline-none [&_.ProseMirror_ul]:list-disc [&_.ProseMirror_ul]:pl-5 [&_.ProseMirror_ol]:list-decimal [&_.ProseMirror_ol]:pl-5 [&_.ProseMirror_p]:my-1 focus-within:ring-2 focus-within:ring-gold"
      />
    </div>
  )
}
