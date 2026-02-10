import { cn } from "@repo/ui/lib/utils";
import {
	Bell,
	Bookmark,
	ChevronRight,
	CornerUpRight,
	Hash,
	Inbox,
	MessageSquareText,
	Mic,
	Paperclip,
	Pin,
	Plus,
	Search,
	Settings,
	Smile,
	Users,
	Volume2,
} from "lucide-react";
import Image from "next/image";
import { redirect } from "next/navigation";

const users = [
	{
		id: 1,
		name: "Alex Rivera",
		avatar: "https://i.pravatar.cc/80?img=12",
		role: "Admin" as const,
	},
	{
		id: 2,
		name: "Sam Chen",
		avatar: "https://i.pravatar.cc/80?img=33",
		role: "Moderator" as const,
	},
	{
		id: 3,
		name: "Jordan Blake",
		avatar: "https://i.pravatar.cc/80?img=53",
		role: "Member" as const,
	},
	{
		id: 4,
		name: "Casey Kim",
		avatar: "https://i.pravatar.cc/80?img=47",
		role: "Member" as const,
	},
	{
		id: 5,
		name: "Morgan Lee",
		avatar: "https://i.pravatar.cc/80?img=23",
		role: "Member" as const,
	},
	{
		id: 6,
		name: "Riley Park",
		avatar: "https://i.pravatar.cc/80?img=60",
		role: "Member" as const,
	},
	{
		id: 7,
		name: "Drew Foster",
		avatar: "https://i.pravatar.cc/80?img=8",
		role: "Member" as const,
	},
	{
		id: 8,
		name: "Avery Quinn",
		avatar: "https://i.pravatar.cc/80?img=5",
		role: "Member" as const,
	},
];

const channels = [
	{ name: "general", active: true, unread: false },
	{ name: "introductions", active: false, unread: true },
	{ name: "development", active: false, unread: false },
	{ name: "design", active: false, unread: false },
	{ name: "off-topic", active: false, unread: true },
];

const voiceChannels = [
	{ name: "Lounge", usersIn: ["Sam Chen", "Jordan Blake"] },
	{ name: "Dev Session", usersIn: [] },
];

const dmUsers = [
	{ name: "Sam Chen", status: "online" as const },
	{ name: "Casey Kim", status: "online" as const },
	{ name: "Drew Foster", status: "away" as const },
];

type Message = {
	id: string;
	userId: number;
	content: string;
	timestamp: string;
	reactions: { emoji: string; count: number; active: boolean }[];
	replyTo?: string;
	discussion?: { count: number; avatars: number[] };
};

const messages: Message[] = [
	{
		id: "m1",
		userId: 1,
		content:
			"Just merged the new notification system. Mentions, replies, and thread updates all working. Took a while to get the batching logic right but it feels snappy now.",
		timestamp: "10:23 AM",
		reactions: [
			{ emoji: "🎉", count: 5, active: false },
			{ emoji: "🔥", count: 3, active: true },
		],
	},
	{
		id: "m2",
		userId: 2,
		content:
			"Nice work! I'll pull and test after lunch. Been waiting for this — the old system was dropping notifications left and right.",
		timestamp: "10:25 AM",
		reactions: [],
	},
	{
		id: "m3",
		userId: 3,
		content:
			"Just ran through it locally. Super smooth. Love that you can mute individual threads without muting the whole channel.",
		timestamp: "10:28 AM",
		reactions: [{ emoji: "💯", count: 4, active: false }],
	},
	{
		id: "m4",
		userId: 4,
		content:
			'Quick question — is there a way to set up keyword alerts? Like getting pinged when someone mentions "design system" in any channel?',
		timestamp: "10:32 AM",
		reactions: [],
	},
	{
		id: "m5",
		userId: 1,
		replyTo: "m4",
		content:
			"Not yet but it's on the roadmap. Probably v0.3 alongside custom notification schedules. Should be pretty straightforward to add.",
		timestamp: "10:34 AM",
		reactions: [{ emoji: "👍", count: 6, active: true }],
	},
	{
		id: "m6",
		userId: 5,
		content:
			"Hey everyone, just joined the project yesterday! Where's the best place to start if I want to contribute? Mostly do frontend work.",
		timestamp: "10:36 AM",
		reactions: [],
		discussion: { count: 3, avatars: [2, 3, 6] },
	},
	{
		id: "m7",
		userId: 2,
		content:
			"Welcome! Check out CONTRIBUTING.md in the repo — the getting started section is solid. And the #development channel is where most technical discussion happens.",
		timestamp: "10:37 AM",
		reactions: [{ emoji: "👋", count: 3, active: false }],
	},
	{
		id: "m8",
		userId: 7,
		content:
			"Voice channels are live on the staging branch if anyone wants to test. Screen sharing is working too. Jump in the Lounge if you want to try it out.",
		timestamp: "10:41 AM",
		reactions: [
			{ emoji: "🎧", count: 4, active: false },
			{ emoji: "🚀", count: 3, active: true },
		],
		discussion: { count: 2, avatars: [4, 5] },
	},
];

function Avatar({
	src,
	initials,
	size = "md",
}: {
	src?: string;
	initials?: string;
	size?: "sm" | "md";
}) {
	const px = size === "sm" ? 32 : 36;
	const sizeClass = size === "sm" ? "size-8" : "size-9";
	if (src) {
		return (
			<Image
				src={src}
				alt=""
				width={px}
				height={px}
				className={cn("shrink-0 rounded-full object-cover", sizeClass)}
			/>
		);
	}
	return (
		<div
			className={cn(
				"flex shrink-0 items-center justify-center rounded-full bg-muted font-semibold text-muted-foreground",
				sizeClass,
				size === "sm" ? "text-xs" : "text-[13px]",
			)}
		>
			{initials}
		</div>
	);
}

export default function PreviewPage() {
	redirect("/");

	return (
		<div className="flex h-screen select-none overflow-hidden bg-background text-foreground">
			{/* Sidebar */}
			<div className="flex w-[248px] shrink-0 flex-col border-r border-border bg-card">
				{/* Workspace header */}
				<div className="flex h-[49px] items-center gap-2.5 border-b border-border px-5">
					<Image
						src="/logo.png"
						alt="Townhall"
						width={28}
						height={28}
						className="rounded-lg"
					/>
					<h2 className="text-[15px] font-bold tracking-tight">Townhall</h2>
				</div>

				{/* Search */}
				<div className="px-3 pt-3 pb-1">
					<div className="flex h-8 items-center gap-2 rounded-md border border-border bg-background px-2.5 text-[13px] text-muted-foreground">
						<Search className="size-3.5 shrink-0" />
						<span>Search</span>
					</div>
				</div>

				{/* Nav */}
				<nav className="flex-1 overflow-y-auto px-3 pt-3">
					{/* Channels */}
					<span className="mb-1 block px-2 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
						Channels
					</span>
					{channels.map((ch) => (
						<div
							key={ch.name}
							className={cn(
								"relative flex items-center gap-2 rounded-lg px-2 py-[6px] text-[14px]",
								ch.active
									? "bg-foreground/[0.06] font-medium text-foreground"
									: ch.unread
										? "font-medium text-foreground"
										: "text-muted-foreground",
							)}
						>
							{ch.active && (
								<div className="absolute left-0 top-1/2 h-4 w-[3px] -translate-y-1/2 rounded-r-full bg-primary" />
							)}
							<Hash className="size-[16px] shrink-0 opacity-50" />
							<span className="truncate">{ch.name}</span>
							{ch.unread && !ch.active && (
								<div className="ml-auto size-1.5 shrink-0 rounded-full bg-primary" />
							)}
						</div>
					))}

					{/* Voice */}
					<span className="mb-1 mt-5 block px-2 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
						Voice
					</span>
					{voiceChannels.map((ch) => (
						<div key={ch.name}>
							<div className="flex items-center gap-2 rounded-lg px-2 py-[6px] text-[14px] text-muted-foreground">
								<Volume2 className="size-[16px] shrink-0 opacity-50" />
								<span className="truncate">{ch.name}</span>
								{ch.usersIn.length > 0 && (
									<div className="ml-auto flex items-center gap-1">
										<div className="flex gap-[3px]">
											<div className="h-3 w-[2px] animate-pulse rounded-full bg-emerald-500" />
											<div className="h-2 w-[2px] animate-pulse rounded-full bg-emerald-500 [animation-delay:150ms]" />
											<div className="h-3.5 w-[2px] animate-pulse rounded-full bg-emerald-500 [animation-delay:300ms]" />
										</div>
										<span className="text-[11px] text-emerald-600">
											{ch.usersIn.length}
										</span>
									</div>
								)}
							</div>
							{ch.usersIn.length > 0 && (
								<div className="mb-1 ml-2 space-y-px">
									{ch.usersIn.map((name) => {
										const u = users.find((usr) => usr.name === name);
										return (
											<div
												key={name}
												className="flex items-center gap-2 rounded-md px-2 py-1 text-[13px] text-muted-foreground"
											>
												{u && <Avatar src={u.avatar} size="sm" />}
												<span className="truncate">{name}</span>
											</div>
										);
									})}
								</div>
							)}
						</div>
					))}

					{/* Direct Messages */}
					<span className="mb-1 mt-5 block px-2 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
						Messages
					</span>
					{dmUsers.map((dm) => {
						const u = users.find((usr) => usr.name === dm.name);
						return (
							<div
								key={dm.name}
								className="flex items-center gap-2.5 rounded-lg px-2 py-[6px] text-[14px] text-muted-foreground"
							>
								<div className="relative">
									{u && <Avatar src={u.avatar} size="sm" />}
									<div
										className={cn(
											"absolute -bottom-0.5 -right-0.5 size-2.5 rounded-full border-[2px] border-card",
											dm.status === "online"
												? "bg-emerald-500"
												: "bg-amber-400",
										)}
									/>
								</div>
								<span className="truncate">{dm.name}</span>
							</div>
						);
					})}
				</nav>

				{/* User bar */}
				<div className="border-t border-border px-3 py-2.5">
					<div className="flex items-center gap-2.5">
						<div className="relative">
							<Avatar initials="JD" size="sm" />
							<div className="absolute -bottom-0.5 -right-0.5 size-2.5 rounded-full border-[2px] border-card bg-emerald-500" />
						</div>
						<div className="min-w-0 flex-1">
							<div className="truncate text-[13px] font-semibold leading-tight">
								john_doe
							</div>
							<div className="truncate text-[11px] leading-tight text-muted-foreground">
								Set a status
							</div>
						</div>
						<button
							type="button"
							className="rounded-md p-1.5 text-muted-foreground hover:bg-foreground/5"
						>
							<Settings className="size-4" />
						</button>
					</div>
				</div>
			</div>

			{/* Main content area */}
			<div className="flex flex-1 flex-col">
				{/* Channel header */}
				<div className="flex h-[49px] items-center justify-between border-b border-border px-4">
					<div className="flex items-center gap-2">
						<Hash className="size-[18px] text-muted-foreground" />
						<span className="text-[15px] font-bold">general</span>
						<Bookmark className="ml-1 size-4 text-muted-foreground" />
						<div className="mx-1 h-5 w-px bg-border" />
						<span className="text-[13px] text-muted-foreground">
							Main discussion for Townhall development
						</span>
					</div>
					<div className="flex items-center gap-1 text-muted-foreground">
						<button
							type="button"
							className="rounded-md p-1.5 hover:bg-foreground/5 hover:text-foreground"
						>
							<Bell className="size-[18px]" />
						</button>
						<button
							type="button"
							className="rounded-md p-1.5 hover:bg-foreground/5 hover:text-foreground"
						>
							<Pin className="size-[18px]" />
						</button>
						<button
							type="button"
							className="flex items-center gap-1.5 rounded-md px-2 py-1.5 text-[13px] hover:bg-foreground/5 hover:text-foreground"
						>
							<Users className="size-[18px]" />
							<span>{users.length}</span>
						</button>
						<div className="mx-1 h-5 w-px bg-border" />
						<div className="flex h-7 w-40 items-center gap-2 rounded-md bg-secondary px-2.5 text-[13px]">
							<Search className="size-3.5" />
							<span>Search</span>
						</div>
						<button
							type="button"
							className="rounded-md p-1.5 hover:bg-foreground/5 hover:text-foreground"
						>
							<Inbox className="size-[18px]" />
						</button>
					</div>
				</div>

				{/* Messages + Member list */}
				<div className="flex flex-1 overflow-hidden">
					{/* Message feed */}
					<div className="flex flex-1 flex-col">
						<div className="flex-1 overflow-y-auto pb-4 pt-4">
							{/* Channel welcome */}
							<div className="mb-4 px-5">
								<div className="mb-2 flex size-[72px] items-center justify-center rounded-2xl bg-muted">
									<Hash className="size-9 text-muted-foreground" />
								</div>
								<h3 className="text-[22px] font-bold"># general</h3>
								<p className="mt-0.5 text-[15px] text-muted-foreground">
									This is the very beginning of the{" "}
									<span className="font-semibold text-foreground">
										#general
									</span>{" "}
									channel. Post anything related to Townhall development here.
								</p>
							</div>

							{/* Date divider */}
							<div className="mx-5 mb-2 mt-2 flex items-center">
								<div className="h-px flex-1 bg-border" />
								<span className="px-3 text-[12px] font-semibold text-muted-foreground">
									February 9, 2026
								</span>
								<div className="h-px flex-1 bg-border" />
							</div>

							{/* Messages */}
							{messages.map((msg, idx) => {
								const user = users.find((u) => u.id === msg.userId);
								if (!user) return null;
								const prevMsg = idx > 0 ? messages[idx - 1] : null;
								const sameAuthor =
									prevMsg?.userId === msg.userId && !msg.replyTo;

								const replyTarget = msg.replyTo
									? messages.find((m) => m.id === msg.replyTo)
									: null;
								const replyUser = replyTarget
									? users.find((u) => u.id === replyTarget.userId)
									: null;

								if (sameAuthor) {
									return (
										<div
											key={msg.id}
											className="group flex gap-4 px-5 py-0.5 hover:bg-foreground/[0.015]"
										>
											<div className="w-9 shrink-0 pt-[3px] text-center text-[11px] text-transparent group-hover:text-muted-foreground">
												{msg.timestamp}
											</div>
											<div className="min-w-0 flex-1">
												<p className="text-[15px] leading-[1.45]">
													{msg.content}
												</p>
												{msg.reactions.length > 0 && (
													<Reactions reactions={msg.reactions} />
												)}
												{msg.discussion && (
													<Discussion discussion={msg.discussion} />
												)}
											</div>
										</div>
									);
								}

								return (
									<div
										key={msg.id}
										className={cn(
											"group hover:bg-foreground/[0.015]",
											idx > 0 && "mt-3",
										)}
									>
										{/* Inline reply reference */}
										{replyTarget && replyUser && (
											<div className="mb-0.5 flex items-center gap-1.5 pl-[26px] text-[12px] text-muted-foreground">
												<CornerUpRight className="size-3 shrink-0" />
												<Image
													src={replyUser.avatar}
													alt=""
													width={14}
													height={14}
													className="size-3.5 rounded-full object-cover"
												/>
												<span className="font-semibold">{replyUser.name}</span>
												<span className="truncate opacity-70">
													{replyTarget.content}
												</span>
											</div>
										)}
										<div className="flex gap-4 px-5 py-1">
											<Avatar src={user.avatar} />
											<div className="min-w-0 flex-1">
												<div className="flex items-baseline gap-2">
													<span className="text-[15px] font-bold leading-none">
														{user.name}
													</span>
													{user.role !== "Member" && (
														<span
															className={cn(
																"rounded px-1.5 py-px text-[10px] font-semibold uppercase",
																user.role === "Admin"
																	? "bg-primary/15 text-primary"
																	: "bg-muted text-muted-foreground",
															)}
														>
															{user.role}
														</span>
													)}
													<span className="text-[12px] text-muted-foreground">
														{msg.timestamp}
													</span>
												</div>
												<p className="mt-0.5 text-[15px] leading-[1.45]">
													{msg.content}
												</p>
												{msg.reactions.length > 0 && (
													<Reactions reactions={msg.reactions} />
												)}
												{msg.discussion && (
													<Discussion discussion={msg.discussion} />
												)}
											</div>
										</div>
									</div>
								);
							})}
						</div>

						{/* Compose */}
						<div className="px-5 pb-5">
							<div className="flex items-center rounded-xl border border-border bg-card px-1">
								<button
									type="button"
									className="shrink-0 rounded-lg p-2 text-muted-foreground hover:text-foreground"
								>
									<Plus className="size-5" />
								</button>
								<div className="flex-1 py-[10px] text-[15px] text-muted-foreground">
									Message #general
								</div>
								<div className="flex shrink-0 items-center gap-0.5">
									<button
										type="button"
										className="rounded-lg p-2 text-muted-foreground hover:text-foreground"
									>
										<Paperclip className="size-5" />
									</button>
									<button
										type="button"
										className="rounded-lg p-2 text-muted-foreground hover:text-foreground"
									>
										<Smile className="size-5" />
									</button>
									<button
										type="button"
										className="rounded-lg p-2 text-muted-foreground hover:text-foreground"
									>
										<Mic className="size-5" />
									</button>
								</div>
							</div>
						</div>
					</div>

					{/* Right sidebar — members */}
					<div className="w-[240px] shrink-0 overflow-y-auto border-l border-border bg-card px-3 pt-5">
						<div className="mb-2 px-1">
							<span className="text-[12px] font-semibold text-muted-foreground">
								Members — {users.length}
							</span>
						</div>
						{users.map((user) => (
							<div
								key={user.id}
								className="flex items-center gap-2.5 rounded-md px-2 py-1.5 hover:bg-foreground/[0.04]"
							>
								<div className="relative">
									<Avatar src={user.avatar} size="sm" />
									<div className="absolute -bottom-0.5 -right-0.5 size-3 rounded-full border-2 border-card bg-emerald-500" />
								</div>
								<div className="min-w-0">
									<span className="block truncate text-[14px]">
										{user.name}
									</span>
									{user.role !== "Member" && (
										<span className="text-[11px] text-muted-foreground">
											{user.role}
										</span>
									)}
								</div>
							</div>
						))}
					</div>
				</div>
			</div>
		</div>
	);
}

function Reactions({
	reactions,
}: {
	reactions: { emoji: string; count: number; active: boolean }[];
}) {
	return (
		<div className="mt-1 flex gap-1">
			{reactions.map((r) => (
				<div
					key={r.emoji}
					className={cn(
						"flex items-center gap-1 rounded-full border px-2 py-0.5 text-[12px]",
						r.active
							? "border-primary/30 bg-primary/10"
							: "border-border bg-secondary",
					)}
				>
					<span>{r.emoji}</span>
					<span className="font-medium text-muted-foreground">{r.count}</span>
				</div>
			))}
		</div>
	);
}

function Discussion({
	discussion,
}: {
	discussion: { count: number; avatars: number[] };
}) {
	return (
		<div className="mt-1.5 flex items-center gap-2">
			<MessageSquareText className="size-4 text-primary" />
			<div className="flex -space-x-1.5">
				{discussion.avatars.map((uid) => {
					const u = users.find((usr) => usr.id === uid);
					if (!u) return null;
					return (
						<Image
							key={u.id}
							src={u.avatar}
							alt=""
							width={20}
							height={20}
							className="size-5 rounded-full border-2 border-background object-cover"
						/>
					);
				})}
			</div>
			<span className="text-[12px] font-semibold text-primary hover:underline">
				{discussion.count} in discussion
			</span>
			<ChevronRight className="size-3 text-muted-foreground" />
		</div>
	);
}
