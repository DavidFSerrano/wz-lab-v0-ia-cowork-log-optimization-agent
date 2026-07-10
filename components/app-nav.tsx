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

export function AppNav() {
  const pathname = usePathname()

  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      {/* Logo */}
      <Link href="/" className="shrink-0" aria-label="ExampleCorp — go to chat">
        <Image
          src="/examplecorp-logo.png"
          alt="ExampleCorp Log Optimization Agent"
          width={220}
          height={52}
          priority
          className="h-10 w-auto object-contain"
        />
      </Link>

      {/* Nav links */}
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
    </div>
  )
}
