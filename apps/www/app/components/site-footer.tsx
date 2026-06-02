const GITHUB_URL = "https://github.com/BuckyMcYolo/lor"

type LinkGroup = {
  title: string
  links: { label: string; href: string; external?: boolean }[]
}

const GROUPS: LinkGroup[] = [
  {
    title: "Product",
    links: [
      { label: "Channels", href: "#" },
      { label: "Voice", href: "#" },
      { label: "Merlin", href: "#" },
      { label: "Integrations", href: "#" },
      { label: "Self-host", href: "#" },
    ],
  },
  {
    title: "Open Source",
    links: [
      { label: "GitHub", href: GITHUB_URL, external: true },
      {
        label: "License (AGPL-3.0)",
        href: `${GITHUB_URL}/blob/main/LICENSE`,
        external: true,
      },
      {
        label: "Contribute",
        href: `${GITHUB_URL}/blob/main/CONTRIBUTING.md`,
        external: true,
      },
      { label: "Roadmap", href: "#" },
    ],
  },
  {
    title: "Resources",
    links: [
      { label: "Docs", href: "#" },
      { label: "Changelog", href: "#" },
      { label: "Blog", href: "#" },
      { label: "Security", href: "#" },
    ],
  },
  {
    title: "Company",
    links: [
      { label: "About", href: "#" },
      { label: "Careers", href: "#" },
      { label: "Contact", href: "#" },
    ],
  },
]

type Social = {
  label: string
  href: string
  icon: React.ReactNode
}

const SOCIALS: Social[] = [
  {
    label: "GitHub",
    href: GITHUB_URL,
    icon: <GitHubIcon />,
  },
  {
    label: "X",
    href: "#",
    icon: <XIcon />,
  },
  {
    label: "Discord",
    href: "#",
    icon: <DiscordIcon />,
  },
  {
    label: "LinkedIn",
    href: "#",
    icon: <LinkedInIcon />,
  },
]

export function SiteFooter() {
  return (
    <footer className="w-full border-t border-foreground/[0.06] bg-background">
      <div className="mx-auto max-w-6xl px-6">
        {/* Top: link groups + socials */}
        <div className="flex flex-col justify-between gap-12 py-10 lg:flex-row lg:gap-8 lg:py-14">
          <div className="grid flex-1 grid-cols-2 gap-8 md:grid-cols-4 lg:gap-12">
            {GROUPS.map((group) => (
              <div key={group.title} className="flex flex-col gap-4">
                <h4 className="text-xs uppercase tracking-wider text-foreground">
                  {group.title}
                </h4>
                <ul className="flex flex-col gap-2">
                  {group.links.map((link) => (
                    <li key={link.label}>
                      <a
                        href={link.href}
                        className="text-sm text-muted-foreground transition-colors hover:text-foreground"
                        {...(link.external
                          ? { target: "_blank", rel: "noopener noreferrer" }
                          : {})}
                      >
                        {link.label}
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>

          <div className="flex shrink-0 flex-col gap-10">
            <div className="flex gap-3">
              {SOCIALS.map((social) => (
                <a
                  key={social.label}
                  href={social.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={social.label}
                  className="inline-flex size-9 items-center justify-center rounded-md border border-foreground/[0.12] bg-background text-foreground/85 transition-colors hover:bg-foreground/5 hover:text-foreground"
                >
                  {social.icon}
                </a>
              ))}
            </div>
          </div>
        </div>

        {/* Giant stroked wordmark — bleeds into the bottom row */}
        <div className="-mt-4 mask-b-from-20 overflow-hidden md:-mt-28 md:mask-b-from-50">
          <span
            aria-hidden
            className="pointer-events-none inline-block w-full translate-y-1/3 select-none text-center font-extrabold text-[28vw] text-foreground leading-none tracking-tighter opacity-20"
            style={{
              WebkitTextStroke: "1px currentColor",
              WebkitTextFillColor: "transparent",
              backgroundClip: "text",
            }}
          >
            Lor
          </span>
        </div>
      </div>

      {/* Full-width divider + bottom row */}
      <div className="border-t border-foreground/[0.06]">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-6 px-6 py-5 text-xs text-muted-foreground md:flex-row">
          <div className="flex flex-col items-center gap-6 md:flex-row">
            <p>© {new Date().getFullYear()} Lor. Built in the open.</p>
            <div className="flex gap-6">
              <a className="hover:text-foreground" href="#">
                Terms of Service
              </a>
              <a className="hover:text-foreground" href="#">
                Privacy Policy
              </a>
            </div>
          </div>
          <a
            href="#"
            className="inline-flex items-center gap-2 rounded-md px-2 py-1 text-xs transition-colors hover:bg-foreground/5"
          >
            <span className="relative flex size-2 items-center justify-center">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400/70" />
              <span className="relative inline-flex size-1.5 rounded-full bg-emerald-400" />
            </span>
            <span>All Systems Normal</span>
          </a>
        </div>
      </div>
    </footer>
  )
}

// ---------------------------------------------------------------------------
// Brand icons (fill="currentColor", 16×16)
// ---------------------------------------------------------------------------

function GitHubIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="currentColor"
      xmlns="http://www.w3.org/2000/svg"
      className="size-4"
      aria-hidden
    >
      <title>GitHub</title>
      <path d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12" />
    </svg>
  )
}

function XIcon() {
  return (
    <svg
      fill="currentColor"
      viewBox="0 0 24 24"
      xmlns="http://www.w3.org/2000/svg"
      className="size-3.5"
      aria-hidden
    >
      <title>X (Twitter)</title>
      <path d="m18.9,1.153h3.682l-8.042,9.189,9.46,12.506h-7.405l-5.804-7.583-6.634,7.583H.469l8.6-9.831L0,1.153h7.593l5.241,6.931,6.065-6.931Zm-1.293,19.494h2.039L6.482,3.239h-2.19l13.314,17.408Z" />
    </svg>
  )
}

function DiscordIcon() {
  return (
    <svg
      fill="currentColor"
      preserveAspectRatio="xMidYMid"
      viewBox="0 0 256 199"
      xmlns="http://www.w3.org/2000/svg"
      className="size-4"
      aria-hidden
    >
      <title>Discord</title>
      <path d="M216.856 16.597A208.502 208.502 0 0 0 164.042 0c-2.275 4.113-4.933 9.645-6.766 14.046-19.692-2.961-39.203-2.961-58.533 0-1.832-4.4-4.55-9.933-6.846-14.046a207.809 207.809 0 0 0-52.855 16.638C5.618 67.147-3.443 116.4 1.087 164.956c22.169 16.555 43.653 26.612 64.775 33.193A161.094 161.094 0 0 0 79.735 175.3a136.413 136.413 0 0 1-21.846-10.632 108.636 108.636 0 0 0 5.356-4.237c42.122 19.702 87.89 19.702 129.51 0a131.66 131.66 0 0 0 5.355 4.237 136.07 136.07 0 0 1-21.886 10.653c4.006 8.02 8.638 15.67 13.873 22.848 21.142-6.58 42.646-16.637 64.815-33.213 5.316-56.288-9.08-105.09-38.056-148.36ZM85.474 135.095c-12.645 0-23.015-11.805-23.015-26.18s10.149-26.2 23.015-26.2c12.867 0 23.236 11.804 23.015 26.2.02 14.375-10.148 26.18-23.015 26.18Zm85.051 0c-12.645 0-23.014-11.805-23.014-26.18s10.148-26.2 23.014-26.2c12.867 0 23.236 11.804 23.015 26.2 0 14.375-10.148 26.18-23.015 26.18Z" />
    </svg>
  )
}

function LinkedInIcon() {
  return (
    <svg
      fill="currentColor"
      viewBox="0 0 24 24"
      xmlns="http://www.w3.org/2000/svg"
      className="size-4"
      aria-hidden
    >
      <title>LinkedIn</title>
      <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
    </svg>
  )
}
