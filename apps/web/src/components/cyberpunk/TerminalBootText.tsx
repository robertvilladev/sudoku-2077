interface TerminalBootTextProps {
  lines: string[];
}

export function TerminalBootText({ lines }: TerminalBootTextProps) {
  return (
    <div className="font-mono text-[11px] leading-relaxed text-neutral-600">
      {lines.map((line, index) => (
        <div key={index}>
          {"> ".repeat(index === 0 ? 2 : 1)}
          {line}
        </div>
      ))}
    </div>
  );
}
