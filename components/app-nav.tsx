"use client"

import Image from "next/image"
import Link from "next/link"
import { usePathname } from "next/navigation"

const NAV_LINKS = [
  { href: "/",             label: "Chat"         },
  { href: "/demo",         label: "Demo"         },
  { href: "/logs",         label: "Live logs"    },
  { href: "/compress",     label: "Compressor"   },
  { href: "/stream",       label: "Stream"       },
  { href: "/architecture", label: "Architecture" },
]

/** Top banner — logo only. Render this above each page's header. */
export function AppBanner() {
  return (
    <div className="border-b border-border bg-surface/80 px-6 py-3 backdrop-blur-sm">
      <Link href="/" aria-label="ExampleCorp — go to chat" className="inline-block">
        <Image
          src="/examplecorp-logo.png"
          alt="ExampleCorp Log Optimization Agent"
          width={220}
          height={52}
          priority
          className="h-10 w-auto object-contain"
        />
      </Link>
    </div>
  )
}

/** Nav pill row — all route links with active-state highlight. */
export function AppNav() {
  const pathname = usePathname()

  return (
    <nav className="flex flex-wrap items-center gap-1.5" aria-label="Primary navigation">
      {NAV_LINKS.map(({ href, label }) => {
        const isActive = pathname === href
        return isActive ? (
          <span
            key={href}
            aria-current="page"
            className="rounded-lg border border-accent/60 bg-accent/10 px-3 py-1 font-mono text-xs font-medium uppercase tracking-wider text-accent"
          >
            {label}
          </span>
        ) : (
          <Link
            key={href}
            href={href}
            className="rounded-lg border border-border px-3 py-1 font-mono text-xs font-medium uppercase tracking-wider text-muted transition-colors hover:border-accent hover:text-accent"
          >
            {label}
          </Link>
        )
      })}
    </nav>
  )
}
