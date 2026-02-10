import { Badge } from "@repo/ui/components/badge";
import { Button } from "@repo/ui/components/button";
import {
	Card,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@repo/ui/components/card";
import { Input } from "@repo/ui/components/input";
import { Separator } from "@repo/ui/components/separator";
import {
	ArrowRight,
	Code2,
	Github,
	Lock,
	MessageSquare,
	ShieldOff,
	Star,
	Users,
} from "lucide-react";
import { ThemeToggle } from "./components/theme-toggle";

function Navbar() {
	return (
		<header className="sticky top-0 z-50 border-b border-border/40 bg-background/80 backdrop-blur-sm">
			<nav className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
				<div className="flex items-center gap-2">
					<MessageSquare className="size-6" />
					<span className="text-lg font-semibold tracking-tight">Townhall</span>
				</div>
				<div className="flex items-center gap-3">
					<Button variant="ghost" size="sm" asChild>
						<a
							href="https://github.com"
							target="_blank"
							rel="noopener noreferrer"
						>
							<Github className="size-4" />
							<span className="hidden sm:inline">GitHub</span>
						</a>
					</Button>
					<Button size="sm" asChild>
						<a href="#waitlist">Join Waitlist</a>
					</Button>
				</div>
			</nav>
		</header>
	);
}

function Hero() {
	return (
		<section className="mx-auto max-w-6xl px-6 py-24 md:py-32 lg:py-40">
			<div className="flex flex-col items-center text-center">
				<Badge variant="secondary" className="mb-6">
					No facial ID. No exceptions.
				</Badge>
				<h1 className="max-w-3xl text-4xl font-bold tracking-tight sm:text-5xl md:text-6xl lg:text-7xl">
					Communication without surveillance
				</h1>
				<p className="mt-6 max-w-2xl text-lg text-muted-foreground sm:text-xl">
					Townhall is an open-source platform for communities to connect —
					without handing over biometric data. Voice, video, text, and
					everything you need. Nothing you don&apos;t.
				</p>
				<div className="mt-10 flex w-full max-w-md flex-col gap-3 sm:flex-row">
					<Input
						type="email"
						placeholder="you@email.com"
						className="h-11 sm:flex-1"
					/>
					<Button size="lg" className="h-11">
						Join the Waitlist
						<ArrowRight className="size-4" />
					</Button>
				</div>
				<p className="mt-3 text-sm text-muted-foreground">
					Be the first to know when we launch. No spam, ever.
				</p>
			</div>
			<div className="mt-16 overflow-hidden rounded-xl border border-border/40 bg-muted/30">
				<div className="flex aspect-video items-center justify-center">
					<div className="text-center">
						<div className="mx-auto mb-3 flex size-12 items-center justify-center rounded-lg bg-muted">
							<MessageSquare className="size-6 text-muted-foreground" />
						</div>
						<p className="text-sm font-medium text-muted-foreground">
							Screenshot coming soon
						</p>
						<p className="mt-1 text-xs text-muted-foreground/60">
							Work in progress
						</p>
					</div>
				</div>
			</div>
		</section>
	);
}

const features = [
	{
		icon: ShieldOff,
		title: "No Facial ID",
		description:
			"We will never ask you to scan your face. Verify your identity on your own terms — or don't. Your choice.",
	},
	{
		icon: Lock,
		title: "Privacy First",
		description:
			"Your conversations belong to you. We don't mine your data, sell your habits, or train models on your messages.",
	},
	{
		icon: Users,
		title: "Community-First",
		description:
			"Servers, channels, voice, video, threads — all the tools your community needs to thrive, with no artificial limits.",
	},
	{
		icon: Code2,
		title: "Open Source",
		description:
			"Every line of code is public. Audit it, fork it, contribute to it. Transparency isn't a feature — it's the foundation.",
	},
];

function Features() {
	return (
		<section className="border-t border-border/40 bg-muted/30 py-24">
			<div className="mx-auto max-w-6xl px-6">
				<div className="text-center">
					<h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
						Built different
					</h2>
					<p className="mt-4 text-lg text-muted-foreground">
						The features you expect, without the tradeoffs you shouldn&apos;t
						have to make.
					</p>
				</div>
				<div className="mt-14 grid gap-6 sm:grid-cols-2">
					{features.map((feature) => (
						<Card key={feature.title} className="border-border/40">
							<CardHeader>
								<div className="mb-2 flex size-10 items-center justify-center rounded-lg bg-primary/10">
									<feature.icon className="size-5 text-primary" />
								</div>
								<CardTitle>{feature.title}</CardTitle>
								<CardDescription className="text-base">
									{feature.description}
								</CardDescription>
							</CardHeader>
						</Card>
					))}
				</div>
			</div>
		</section>
	);
}

function OpenSource() {
	return (
		<section className="py-24">
			<div className="mx-auto max-w-6xl px-6 text-center">
				<h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
					Open source, open arms
				</h2>
				<p className="mx-auto mt-4 max-w-2xl text-lg text-muted-foreground">
					Townhall is built in the open. Star us on GitHub, open an issue, or
					submit a PR. Every contribution makes the platform better for
					everyone.
				</p>
				<div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
					<Button variant="outline" size="lg" asChild>
						<a
							href="https://github.com"
							target="_blank"
							rel="noopener noreferrer"
						>
							<Star className="size-4" />
							Star on GitHub
							<Separator orientation="vertical" className="mx-1 h-4" />
							<span className="font-mono text-sm text-muted-foreground">
								--
							</span>
						</a>
					</Button>
					<Button variant="ghost" size="lg" asChild>
						<a
							href="https://github.com"
							target="_blank"
							rel="noopener noreferrer"
						>
							Read the Contributing Guide
							<ArrowRight className="size-4" />
						</a>
					</Button>
				</div>
			</div>
		</section>
	);
}

function FinalCta() {
	return (
		<section
			id="waitlist"
			className="border-t border-border/40 bg-muted/30 py-24"
		>
			<div className="mx-auto max-w-6xl px-6 text-center">
				<h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
					Ready to take back your privacy?
				</h2>
				<p className="mx-auto mt-4 max-w-xl text-lg text-muted-foreground">
					Join the waitlist and be the first to experience a communication
					platform that respects you.
				</p>
				<div className="mx-auto mt-10 flex w-full max-w-md flex-col gap-3 sm:flex-row">
					<Input
						type="email"
						placeholder="you@email.com"
						className="h-11 sm:flex-1"
					/>
					<Button size="lg" className="h-11">
						Join the Waitlist
						<ArrowRight className="size-4" />
					</Button>
				</div>
			</div>
		</section>
	);
}

function Footer() {
	return (
		<footer className="border-t border-border/40 py-8">
			<div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-6 sm:flex-row">
				<div className="flex items-center gap-2 text-sm text-muted-foreground">
					<MessageSquare className="size-4" />
					<span>&copy; {new Date().getFullYear()} Townhall</span>
				</div>
				<div className="flex gap-6 text-sm text-muted-foreground">
					<a
						href="https://github.com"
						target="_blank"
						rel="noopener noreferrer"
						className="transition-colors hover:text-foreground"
					>
						GitHub
					</a>
					<a
						href="/privacy"
						className="transition-colors hover:text-foreground"
					>
						Privacy
					</a>
					<a href="/terms" className="transition-colors hover:text-foreground">
						Terms
					</a>
				</div>
			</div>
		</footer>
	);
}

export default function Home() {
	return (
		<div className="flex min-h-svh flex-col">
			<Navbar />
			<main className="flex-1">
				<Hero />
				<Features />
				<OpenSource />
				<FinalCta />
			</main>
			<Footer />
			<ThemeToggle />
		</div>
	);
}
