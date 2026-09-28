type MushafWordProps = {
  word: string;
  highlighted?: boolean;
  hidden?: boolean;
};

export function MushafWord({
  word,
  highlighted = false,
  hidden = false,
}: MushafWordProps) {
  return (
    <span
      data-mushaf-word
      className={[
        "inline-block",
        highlighted
          ? "rounded-md underline decoration-2 underline-offset-4"
          : "",
        hidden ? "invisible" : "",
      ]
        .filter(Boolean)
        .join(" ")}
    >
      {word}
    </span>
  );
}
