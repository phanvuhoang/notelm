"use client";

import { useAtomValue } from "jotai";
import {
	AlertCircle,
	BookOpen,
	Clock,
	Grid3x3,
	List,
	Plus,
	Search,
	Sparkles,
	Users,
} from "lucide-react";
import { motion } from "motion/react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useMemo, useState } from "react";
import { searchSpacesAtom } from "@/atoms/search-spaces/search-space-query.atoms";
import { CreateSearchSpaceDialog } from "@/components/layout";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardFooter,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

function ErrorScreen({ message }: { message: string }) {
	const t = useTranslations("dashboard");
	const router = useRouter();

	return (
		<div className="flex min-h-screen flex-col items-center justify-center gap-4">
			<motion.div
				initial={{ opacity: 0, y: 20 }}
				animate={{ opacity: 1, y: 0 }}
				transition={{ duration: 0.5 }}
			>
				<Card className="w-full max-w-[400px] border-destructive/20 bg-background/60 backdrop-blur-sm">
					<CardHeader className="pb-2">
						<div className="flex items-center gap-2">
							<AlertCircle className="h-5 w-5 text-destructive" />
							<CardTitle className="text-xl font-medium">{t("error")}</CardTitle>
						</div>
						<CardDescription>{t("something_wrong")}</CardDescription>
					</CardHeader>
					<CardContent>
						<Alert variant="destructive" className="border-destructive/30 bg-destructive/10">
							<AlertCircle className="h-4 w-4" />
							<AlertTitle>{t("error_details")}</AlertTitle>
							<AlertDescription className="mt-2">{message}</AlertDescription>
						</Alert>
					</CardContent>
					<CardFooter className="flex justify-end gap-2 border-t pt-4">
						<Button variant="outline" onClick={() => router.refresh()}>
							{t("try_again")}
						</Button>
						<Button onClick={() => router.push("/")}>{t("go_home")}</Button>
					</CardFooter>
				</Card>
			</motion.div>
		</div>
	);
}

// Deterministic colorful gradient per notebook id — NotebookLM-like cover tile.
const COVER_PALETTES: Array<[string, string]> = [
	["from-emerald-500/40", "to-emerald-700/60"],
	["from-teal-500/40", "to-emerald-700/60"],
	["from-lime-500/40", "to-green-700/60"],
	["from-green-500/40", "to-teal-700/60"],
	["from-cyan-500/40", "to-emerald-700/60"],
	["from-emerald-400/40", "to-green-800/60"],
];

function coverFor(id: number) {
	return COVER_PALETTES[id % COVER_PALETTES.length];
}

function formatRelative(iso: string) {
	const then = new Date(iso).getTime();
	const now = Date.now();
	const diffMin = Math.max(1, Math.round((now - then) / 60000));
	if (diffMin < 60) return `${diffMin}m`;
	const diffH = Math.round(diffMin / 60);
	if (diffH < 24) return `${diffH}h`;
	const diffD = Math.round(diffH / 24);
	if (diffD < 30) return `${diffD}d`;
	const diffMo = Math.round(diffD / 30);
	if (diffMo < 12) return `${diffMo}mo`;
	return `${Math.round(diffMo / 12)}y`;
}

function NotebookCard({
	id,
	name,
	description,
	createdAt,
	memberCount,
	isOwner,
	onOpen,
}: {
	id: number;
	name: string;
	description: string | null;
	createdAt: string;
	memberCount: number;
	isOwner: boolean;
	onOpen: () => void;
}) {
	const [from, to] = coverFor(id);
	return (
		<motion.button
			type="button"
			onClick={onOpen}
			whileHover={{ y: -4 }}
			transition={{ type: "spring", stiffness: 300, damping: 20 }}
			className="group relative flex w-full flex-col overflow-hidden rounded-2xl border border-border bg-card text-left shadow-sm transition-all hover:shadow-md hover:border-primary/40 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/60"
		>
			<div
				className={cn(
					"relative h-32 w-full bg-gradient-to-br",
					from,
					to,
					"flex items-end p-4"
				)}
			>
				<BookOpen className="h-8 w-8 text-white/90 drop-shadow" />
				{isOwner ? null : (
					<span className="absolute right-2 top-2 rounded-full bg-black/30 px-2 py-0.5 text-[10px] font-medium text-white backdrop-blur">
						Shared
					</span>
				)}
			</div>
			<div className="flex flex-1 flex-col gap-2 p-4">
				<div className="line-clamp-2 text-base font-semibold leading-tight text-foreground">
					{name}
				</div>
				{description ? (
					<p className="line-clamp-2 text-sm text-muted-foreground">{description}</p>
				) : null}
				<div className="mt-auto flex items-center gap-3 pt-2 text-xs text-muted-foreground">
					<span className="inline-flex items-center gap-1">
						<Clock className="h-3 w-3" />
						{formatRelative(createdAt)}
					</span>
					<span className="inline-flex items-center gap-1">
						<Users className="h-3 w-3" />
						{memberCount}
					</span>
				</div>
			</div>
		</motion.button>
	);
}

function NotebookRow({
	id,
	name,
	description,
	createdAt,
	memberCount,
	isOwner,
	onOpen,
}: {
	id: number;
	name: string;
	description: string | null;
	createdAt: string;
	memberCount: number;
	isOwner: boolean;
	onOpen: () => void;
}) {
	const [from, to] = coverFor(id);
	return (
		<button
			type="button"
			onClick={onOpen}
			className="group flex w-full items-center gap-4 rounded-xl border border-border bg-card p-3 text-left transition-all hover:border-primary/40 hover:bg-accent/40 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/60"
		>
			<div
				className={cn(
					"flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br",
					from,
					to
				)}
			>
				<BookOpen className="h-5 w-5 text-white/90" />
			</div>
			<div className="min-w-0 flex-1">
				<div className="flex items-center gap-2">
					<span className="truncate text-sm font-semibold">{name}</span>
					{!isOwner ? (
						<span className="rounded-full bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
							Shared
						</span>
					) : null}
				</div>
				{description ? (
					<p className="line-clamp-1 text-xs text-muted-foreground">{description}</p>
				) : null}
			</div>
			<div className="flex shrink-0 items-center gap-4 text-xs text-muted-foreground">
				<span className="inline-flex items-center gap-1">
					<Users className="h-3 w-3" />
					{memberCount}
				</span>
				<span className="inline-flex items-center gap-1">
					<Clock className="h-3 w-3" />
					{formatRelative(createdAt)}
				</span>
			</div>
		</button>
	);
}

function EmptyDashboard({ onCreateClick }: { onCreateClick: () => void }) {
	const t = useTranslations("searchSpace");
	return (
		<div className="flex min-h-[60vh] flex-col items-center justify-center gap-6 p-8 text-center">
			<motion.div
				initial={{ opacity: 0, y: 16 }}
				animate={{ opacity: 1, y: 0 }}
				transition={{ duration: 0.4 }}
				className="flex flex-col items-center gap-6"
			>
				<div className="flex h-20 w-20 items-center justify-center rounded-full bg-primary/10">
					<Sparkles className="h-10 w-10 text-primary" />
				</div>
				<div className="flex flex-col gap-2">
					<h1 className="text-2xl font-bold">{t("welcome_title")}</h1>
					<p className="max-w-md text-muted-foreground">{t("welcome_description")}</p>
				</div>
				<Button size="lg" onClick={onCreateClick} className="gap-2">
					<Plus className="h-5 w-5" />
					{t("create_first_button")}
				</Button>
			</motion.div>
		</div>
	);
}

export default function DashboardPage() {
	const router = useRouter();
	const [showCreateDialog, setShowCreateDialog] = useState(false);
	const [view, setView] = useState<"grid" | "list">("grid");
	const [query, setQuery] = useState("");

	const t = useTranslations("dashboard");
	const { data: searchSpaces = [], isLoading, error } = useAtomValue(searchSpacesAtom);

	const filtered = useMemo(() => {
		if (!query.trim()) return searchSpaces;
		const q = query.toLowerCase();
		return searchSpaces.filter(
			(s) =>
				s.name.toLowerCase().includes(q) ||
				(s.description ? s.description.toLowerCase().includes(q) : false)
		);
	}, [searchSpaces, query]);

	if (error) return <ErrorScreen message={error?.message || "Failed to load notebooks"} />;

	const openNotebook = (id: number) => {
		const qs = typeof window !== "undefined" ? window.location.search : "";
		router.push(`/dashboard/${id}/new-chat${qs}`);
	};

	return (
		<div className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 py-8 md:px-8 md:py-10">
			{/* Header */}
			<div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
				<div className="flex flex-col gap-1">
					<h1 className="text-3xl font-bold tracking-tight">
						{t("notebooks_title") || "Notebooks"}
					</h1>
					<p className="text-sm text-muted-foreground">
						{t("notebooks_subtitle") ||
							"Your AI workspaces — chat, mindmap, podcast and slides from your sources."}
					</p>
				</div>
				<Button onClick={() => setShowCreateDialog(true)} size="lg" className="gap-2 self-start">
					<Plus className="h-4 w-4" />
					{t("create_notebook") || "New notebook"}
				</Button>
			</div>

			{/* Controls */}
			{searchSpaces.length > 0 ? (
				<div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
					<div className="relative w-full md:max-w-sm">
						<Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
						<Input
							value={query}
							onChange={(e) => setQuery(e.target.value)}
							placeholder={t("search_placeholder") || "Search notebooks"}
							className="pl-9"
						/>
					</div>
					<div className="inline-flex rounded-lg border border-border bg-card p-1">
						<button
							type="button"
							onClick={() => setView("grid")}
							className={cn(
								"flex h-8 items-center gap-1.5 rounded-md px-2.5 text-xs font-medium transition-colors",
								view === "grid"
									? "bg-primary text-primary-foreground"
									: "text-muted-foreground hover:text-foreground"
							)}
						>
							<Grid3x3 className="h-3.5 w-3.5" />
							Grid
						</button>
						<button
							type="button"
							onClick={() => setView("list")}
							className={cn(
								"flex h-8 items-center gap-1.5 rounded-md px-2.5 text-xs font-medium transition-colors",
								view === "list"
									? "bg-primary text-primary-foreground"
									: "text-muted-foreground hover:text-foreground"
							)}
						>
							<List className="h-3.5 w-3.5" />
							List
						</button>
					</div>
				</div>
			) : null}

			{/* Body */}
			{isLoading ? (
				<div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
					{Array.from({ length: 8 }).map((_, i) => (
						<div
							key={i}
							className="h-60 animate-pulse rounded-2xl border border-border bg-card/60"
						/>
					))}
				</div>
			) : searchSpaces.length === 0 ? (
				<EmptyDashboard onCreateClick={() => setShowCreateDialog(true)} />
			) : filtered.length === 0 ? (
				<div className="flex min-h-[40vh] flex-col items-center justify-center gap-3 text-center">
					<Search className="h-10 w-10 text-muted-foreground" />
					<p className="text-sm text-muted-foreground">
						{t("no_results") || `No notebooks match "${query}"`}
					</p>
				</div>
			) : view === "grid" ? (
				<motion.div
					initial="hidden"
					animate="show"
					variants={{
						hidden: {},
						show: { transition: { staggerChildren: 0.04 } },
					}}
					className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
				>
					{filtered.map((s) => (
						<motion.div
							key={s.id}
							variants={{
								hidden: { opacity: 0, y: 12 },
								show: { opacity: 1, y: 0 },
							}}
						>
							<NotebookCard
								id={s.id}
								name={s.name}
								description={s.description}
								createdAt={s.created_at}
								memberCount={s.member_count}
								isOwner={s.is_owner}
								onOpen={() => openNotebook(s.id)}
							/>
						</motion.div>
					))}
				</motion.div>
			) : (
				<div className="flex flex-col gap-2">
					{filtered.map((s) => (
						<NotebookRow
							key={s.id}
							id={s.id}
							name={s.name}
							description={s.description}
							createdAt={s.created_at}
							memberCount={s.member_count}
							isOwner={s.is_owner}
							onOpen={() => openNotebook(s.id)}
						/>
					))}
				</div>
			)}

			<CreateSearchSpaceDialog open={showCreateDialog} onOpenChange={setShowCreateDialog} />
		</div>
	);
}
