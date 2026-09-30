"use client"

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

export function AppNav() {
  const pathname = usePathname()

  return (
    <nav className="flex flex-wrap items-center gap-1" aria-label="Primary navigation">
      {NAV_LINKS.map(({ href, label }) => {
        const isActive = pathname === href
        return isActive ? (
          <span
            key={href}
            aria-current="page"
            className="rounded-full bg-foreground px-3.5 py-1.5 text-xs font-semibold text-background"
          >
            {label}
          </span>
        ) : (
          <Link
            key={href}
            href={href}
            className="rounded-full px-3.5 py-1.5 text-xs font-medium text-foreground/70 transition-colors hover:bg-surface-2 hover:text-foreground"
          >
            {label}
          </Link>
        )
      })}
    </nav>
  )
}
