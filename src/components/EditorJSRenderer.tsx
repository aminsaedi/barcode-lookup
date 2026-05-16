// Renders the subset of EditorJS blocks used by qlist.ir dossiers:
// header / paragraph / quote / image / delimiter. Inline HTML in block text
// (mostly <b>, <i>, <a href>) is preserved via dangerouslySetInnerHTML —
// content originates from a known source (panel.qlist.ir) so this is a
// content-trust boundary we accept.

export interface EditorJSBlock {
  id?: string
  type: 'header' | 'paragraph' | 'quote' | 'image' | 'delimiter' | string
  data: Record<string, unknown>
}

export interface EditorJSDoc {
  time?: number
  version?: string
  blocks: EditorJSBlock[]
}

interface Props {
  doc: EditorJSDoc
  /**
   * Maps a Directus asset UUID → local /qlist-assets/<file> path. If a fileId
   * is missing from the manifest we fall back to the raw panel.qlist.ir URL.
   */
  assetManifest?: Record<string, string>
  dir?: 'ltr' | 'rtl'
}

function assetUrl(fileId: string | undefined, manifest?: Record<string, string>): string | null {
  if (!fileId) return null
  if (manifest && manifest[fileId]) return `/qlist-assets/${manifest[fileId]}`
  return `https://panel.qlist.ir/assets/${fileId}`
}

export default function EditorJSRenderer({ doc, assetManifest, dir }: Props) {
  return (
    <div
      className="prose-content flex flex-col gap-4 text-slate-200 leading-relaxed"
      dir={dir}
    >
      {doc.blocks.map((b, i) => (
        <Block key={b.id || i} block={b} manifest={assetManifest} />
      ))}
    </div>
  )
}

function Block({ block, manifest }: { block: EditorJSBlock; manifest?: Record<string, string> }) {
  const data = block.data as {
    text?: string
    level?: number
    caption?: string
    alignment?: string
    file?: { fileId?: string; url?: string }
    withBorder?: boolean
    stretched?: boolean
  }
  switch (block.type) {
    case 'header': {
      const lvl = data.level ?? 2
      const cls =
        lvl <= 2
          ? 'text-xl sm:text-2xl font-bold text-white mt-4'
          : 'text-lg sm:text-xl font-semibold text-white mt-3'
      const text = data.text ?? ''
      if (lvl === 1) return <h2 className={cls} dangerouslySetInnerHTML={{ __html: text }} />
      if (lvl === 2) return <h2 className={cls} dangerouslySetInnerHTML={{ __html: text }} />
      if (lvl === 3) return <h3 className={cls} dangerouslySetInnerHTML={{ __html: text }} />
      return <h4 className={cls} dangerouslySetInnerHTML={{ __html: text }} />
    }
    case 'paragraph': {
      return (
        <p
          className="text-base"
          dangerouslySetInnerHTML={{ __html: data.text ?? '' }}
        />
      )
    }
    case 'quote': {
      return (
        <blockquote className="border-s-4 border-blue-500 ps-4 py-2 bg-slate-800/50 rounded-e-lg">
          <p
            className="text-base italic text-slate-200"
            dangerouslySetInnerHTML={{ __html: data.text ?? '' }}
          />
          {data.caption && (
            <footer
              className="mt-2 text-sm text-slate-400"
              dangerouslySetInnerHTML={{ __html: data.caption }}
            />
          )}
        </blockquote>
      )
    }
    case 'image': {
      const src = assetUrl(data.file?.fileId, manifest) || data.file?.url || ''
      if (!src) return null
      return (
        <figure className="my-2">
          <img
            src={src}
            alt={data.caption ?? ''}
            loading="lazy"
            className={`w-full rounded-lg ${data.withBorder ? 'border border-slate-700' : ''}`}
          />
          {data.caption && (
            <figcaption
              className="mt-2 text-sm text-slate-400 text-center"
              dangerouslySetInnerHTML={{ __html: data.caption }}
            />
          )}
        </figure>
      )
    }
    case 'delimiter': {
      return <hr className="my-4 border-slate-700" />
    }
    default:
      // Unknown block type — try to render its text if any.
      if (typeof data.text === 'string') {
        return (
          <p
            className="text-base text-slate-300"
            dangerouslySetInnerHTML={{ __html: data.text }}
          />
        )
      }
      return null
  }
}
