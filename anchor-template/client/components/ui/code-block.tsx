"use client";

import { Check, Copy, Download } from "lucide-react";
import { useCopy } from "@/lib/hooks";

function tomlLine(line: string) {
  if (/^\s*#/.test(line)) return <span className="text-text-tertiary">{line}</span>;
  const section = line.match(/^\s*(\[\[?[^\]]+\]\]?)\s*$/);
  if (section) return <span className="text-cool">{line}</span>;
  const kv = line.match(/^(\s*[A-Za-z0-9_]+)(=)(.*)$/);
  if (kv) {
    return (
      <>
        <span className="text-brand">{kv[1]}</span>
        <span className="text-text-tertiary">{kv[2]}</span>
        <span className="text-pos">{kv[3]}</span>
      </>
    );
  }
  return <span>{line}</span>;
}

function jsonHighlight(code: string) {
  // split into tokens preserving structure for light coloring
  return code.split("\n").map((line, i) => {
    const parts: React.ReactNode[] = [];
    const re = /("(?:[^"\\]|\\.)*"\s*:)|("(?:[^"\\]|\\.)*")|(\b-?\d+\.?\d*\b)|(\btrue\b|\bfalse\b|\bnull\b)/g;
    let last = 0;
    let m: RegExpExecArray | null;
    let k = 0;
    while ((m = re.exec(line))) {
      if (m.index > last) parts.push(<span key={k++}>{line.slice(last, m.index)}</span>);
      if (m[1]) parts.push(<span key={k++} className="text-brand">{m[1]}</span>);
      else if (m[2]) parts.push(<span key={k++} className="text-pos">{m[2]}</span>);
      else if (m[3]) parts.push(<span key={k++} className="text-cool">{m[3]}</span>);
      else parts.push(<span key={k++} className="text-warn">{m[0]}</span>);
      last = m.index + m[0].length;
    }
    if (last < line.length) parts.push(<span key={k++}>{line.slice(last)}</span>);
    return (
      <div key={i} className="whitespace-pre">
        {parts}
      </div>
    );
  });
}

export function CodeBlock({
  code,
  lang = "text",
  filename,
  downloadName,
  maxHeight = 420,
}: {
  code: string;
  lang?: "toml" | "json" | "text";
  filename?: string;
  downloadName?: string;
  maxHeight?: number;
}) {
  const { copied, copy } = useCopy();
  const lines = code.replace(/\n$/, "").split("\n");
  const isCopied = copied === code;

  const download = () => {
    const blob = new Blob([code], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = downloadName ?? "file.txt";
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="overflow-hidden rounded-[12px] border border-border-subtle bg-sunken">
      <div className="flex items-center justify-between border-b border-border-subtle px-3 py-2">
        <span className="font-mono text-[11.5px] text-text-secondary">{filename ?? lang}</span>
        <div className="flex items-center gap-1">
          {downloadName && (
            <button onClick={download} className="flex items-center gap-1 rounded-[7px] px-2 py-1 text-[11px] text-text-tertiary transition-colors hover:bg-surface-2 hover:text-text-primary">
              <Download className="size-3" /> Download
            </button>
          )}
          <button onClick={() => copy(code)} className="flex items-center gap-1 rounded-[7px] px-2 py-1 text-[11px] text-text-tertiary transition-colors hover:bg-surface-2 hover:text-text-primary">
            {isCopied ? <Check className="size-3 text-pos" /> : <Copy className="size-3" />}
            {isCopied ? "Copied" : "Copy"}
          </button>
        </div>
      </div>
      <div className="overflow-auto" style={{ maxHeight }}>
        <pre className="min-w-max py-3 font-mono text-[12px] leading-[1.7]">
          {lang === "json" ? (
            <code className="block px-4">{jsonHighlight(code)}</code>
          ) : (
            lines.map((line, i) => (
              <div key={i} className="flex px-2">
                <span className="w-9 shrink-0 select-none pr-3 text-right text-text-tertiary/60">{i + 1}</span>
                <code className="whitespace-pre">{lang === "toml" ? tomlLine(line) : line || " "}</code>
              </div>
            ))
          )}
        </pre>
      </div>
    </div>
  );
}
