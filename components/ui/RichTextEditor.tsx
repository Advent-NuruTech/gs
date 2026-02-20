"use client";

import { useEffect, useRef } from "react";

import Button from "@/components/ui/Button";

interface RichTextEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}

export default function RichTextEditor({
  value,
  onChange,
  placeholder = "Write here...",
}: RichTextEditorProps) {
  const editorRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!editorRef.current) return;
    if (editorRef.current.innerHTML !== value) {
      editorRef.current.innerHTML = value || `<p>${placeholder}</p>`;
    }
  }, [placeholder, value]);

  const runCommand = (command: string, commandValue?: string) => {
    document.execCommand(command, false, commandValue);
    if (editorRef.current) {
      onChange(editorRef.current.innerHTML);
    }
  };

  return (
    <div className="w-full">
      <div className="flex flex-wrap gap-2 rounded-t-md border border-slate-300 bg-slate-50 p-2">
        <Button type="button" variant="secondary" onClick={() => runCommand("bold")}>
          Bold
        </Button>
        <Button type="button" variant="secondary" onClick={() => runCommand("italic")}>
          Italic
        </Button>
        <Button type="button" variant="secondary" onClick={() => runCommand("underline")}>
          Underline
        </Button>
        <Button type="button" variant="secondary" onClick={() => runCommand("insertUnorderedList")}>
          Bullet
        </Button>
        <Button type="button" variant="secondary" onClick={() => runCommand("insertOrderedList")}>
          Numbered
        </Button>
        <input
          type="color"
          className="h-9 w-10 cursor-pointer rounded border border-slate-300"
          onChange={(event) => runCommand("foreColor", event.target.value)}
          title="Text color"
        />
        <select
          className="h-9 rounded border border-slate-300 px-2 text-sm"
          onChange={(event) => runCommand("fontSize", event.target.value)}
          defaultValue="3"
        >
          <option value="2">Small</option>
          <option value="3">Normal</option>
          <option value="4">Large</option>
          <option value="5">XL</option>
        </select>
        <Button
          type="button"
          variant="secondary"
          onClick={() => {
            const url = window.prompt("Enter URL");
            if (url) runCommand("createLink", url);
          }}
        >
          Link
        </Button>
      </div>

      <div
        ref={editorRef}
        className="min-h-[180px] rounded-b-md border border-slate-300 border-t-0 bg-white p-3 outline-none"
        contentEditable
        suppressContentEditableWarning
        onInput={(event) => onChange((event.target as HTMLDivElement).innerHTML)}
      />
    </div>
  );
}
