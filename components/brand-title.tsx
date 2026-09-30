// Félix logo + page title, shared by every page header.
export function BrandTitle({ title }: { title: string }) {
  return (
    <div className="flex min-w-0 items-center gap-3">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/brand/felix-logo.svg" alt="Félix" width={68} height={24} className="h-6 w-auto shrink-0" />
      <span className="h-5 w-px shrink-0 bg-border" aria-hidden="true" />
      <h1 className="truncate font-display text-base font-extrabold tracking-tight text-foreground">{title}</h1>
    </div>
  )
}
