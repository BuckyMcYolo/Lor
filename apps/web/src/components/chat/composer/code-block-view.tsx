import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@repo/ui/components/select"
import type { NodeViewProps } from "@tiptap/react"
import { NodeViewContent, NodeViewWrapper } from "@tiptap/react"

export const CODE_BLOCK_LANGUAGES = [
  { value: "plaintext", label: "Plain Text" },
  { value: "typescript", label: "TypeScript" },
  { value: "javascript", label: "JavaScript" },
  { value: "python", label: "Python" },
  { value: "json", label: "JSON" },
  { value: "bash", label: "Bash" },
  { value: "css", label: "CSS" },
  { value: "html", label: "HTML" },
  { value: "sql", label: "SQL" },
  { value: "rust", label: "Rust" },
  { value: "go", label: "Go" },
  { value: "java", label: "Java" },
] as const

export const SUPPORTED_LANGUAGE_VALUES: Set<string> = new Set(
  CODE_BLOCK_LANGUAGES.map((l) => l.value)
)

export const LANGUAGE_ALIAS_MAP: Record<string, string> = {
  ts: "typescript",
  tsx: "typescript",
  js: "javascript",
  jsx: "javascript",
  py: "python",
  sh: "bash",
  zsh: "bash",
  shell: "bash",
  xml: "html",
  yml: "yaml",
  rs: "rust",
  golang: "go",
}

export function CodeBlockView({ node, updateAttributes }: NodeViewProps) {
  const language = (node.attrs.language as string) || "plaintext"

  return (
    <NodeViewWrapper className="mt-1 mb-0 overflow-hidden rounded-md border border-border/70 bg-muted/50">
      <div
        className="flex items-center border-b border-border/70 bg-muted/80 px-2 py-1"
        contentEditable={false}
      >
        <Select
          value={language}
          onValueChange={(value) => updateAttributes({ language: value })}
        >
          <SelectTrigger className="h-6 w-auto gap-1 border-none bg-transparent px-1.5 text-[11px] shadow-none focus:ring-0">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {CODE_BLOCK_LANGUAGES.map((lang) => (
              <SelectItem key={lang.value} value={lang.value}>
                {lang.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <pre className="!mt-0 !mb-0 !rounded-none !border-0 px-3 py-2 font-mono text-[0.92em] leading-6">
        <NodeViewContent className="hljs" />
      </pre>
    </NodeViewWrapper>
  )
}
