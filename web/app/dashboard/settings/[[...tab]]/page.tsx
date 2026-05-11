"use client";

import {
	Activity,
	Brain,
	ChevronLeft,
	CircleUser,
	Globe,
	Keyboard,
	KeyRound,
	Monitor,
	ReceiptText,
	ShieldCheck,
	Sparkles,
} from "lucide-react";
import Link from "next/link";
import dynamic from "next/dynamic";
import { useParams, useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useMemo } from "react";
import { Separator } from "@/components/ui/separator";
import { usePlatform } from "@/hooks/use-platform";
import { cn } from "@/lib/utils";

const ProfileContent = dynamic(
	() =>
		import("@/app/dashboard/[search_space_id]/user-settings/components/ProfileContent").then(
			(m) => ({ default: m.ProfileContent })
		),
	{ ssr: false }
);
const ApiKeyContent = dynamic(
	() =>
		import("@/app/dashboard/[search_space_id]/user-settings/components/ApiKeyContent").then(
			(m) => ({ default: m.ApiKeyContent })
		),
	{ ssr: false }
);
const PromptsContent = dynamic(
	() =>
		import("@/app/dashboard/[search_space_id]/user-settings/components/PromptsContent").then(
			(m) => ({ default: m.PromptsContent })
		),
	{ ssr: false }
);
const CommunityPromptsContent = dynamic(
	() =>
		import(
			"@/app/dashboard/[search_space_id]/user-settings/components/CommunityPromptsContent"
		).then((m) => ({ default: m.CommunityPromptsContent })),
	{ ssr: false }
);
const PurchaseHistoryContent = dynamic(
	() =>
		import(
			"@/app/dashboard/[search_space_id]/user-settings/components/PurchaseHistoryContent"
		).then((m) => ({ default: m.PurchaseHistoryContent })),
	{ ssr: false }
);
const DesktopContent = dynamic(
	() =>
		import("@/app/dashboard/[search_space_id]/user-settings/components/DesktopContent").then(
			(m) => ({ default: m.DesktopContent })
		),
	{ ssr: false }
);
const DesktopShortcutsContent = dynamic(
	() =>
		import(
			"@/app/dashboard/[search_space_id]/user-settings/components/DesktopShortcutsContent"
		).then((m) => ({ default: m.DesktopShortcutsContent })),
	{ ssr: false }
);
const MemoryContent = dynamic(
	() =>
		import("@/app/dashboard/[search_space_id]/user-settings/components/MemoryContent").then(
			(m) => ({ default: m.MemoryContent })
		),
	{ ssr: false }
);
const AgentPermissionsContent = dynamic(
	() =>
		import(
			"@/app/dashboard/[search_space_id]/user-settings/components/AgentPermissionsContent"
		).then((m) => ({ default: m.AgentPermissionsContent })),
	{ ssr: false }
);
const AgentStatusContent = dynamic(
	() =>
		import("@/app/dashboard/[search_space_id]/user-settings/components/AgentStatusContent").then(
			(m) => ({ default: m.AgentStatusContent })
		),
	{ ssr: false }
);

export default function UserSettingsPage() {
	const t = useTranslations("userSettings");
	const router = useRouter();
	const params = useParams<{ tab?: string[] }>();
	const { isDesktop } = usePlatform();

	const activeTab = (params?.tab && params.tab[0]) || "profile";

	const navItems = useMemo(
		() => [
			{ value: "profile", label: t("profile_nav_label"), icon: <CircleUser className="h-4 w-4" /> },
			{ value: "api-key", label: t("api_key_nav_label"), icon: <KeyRound className="h-4 w-4" /> },
			{ value: "prompts", label: "My Prompts", icon: <Sparkles className="h-4 w-4" /> },
			{
				value: "community-prompts",
				label: "Community Prompts",
				icon: <Globe className="h-4 w-4" />,
			},
			{ value: "memory", label: "Memory", icon: <Brain className="h-4 w-4" /> },
			{
				value: "agent-permissions",
				label: "Agent Permissions",
				icon: <ShieldCheck className="h-4 w-4" />,
			},
			{ value: "agent-status", label: "Agent Status", icon: <Activity className="h-4 w-4" /> },
			{
				value: "purchases",
				label: "Purchase History",
				icon: <ReceiptText className="h-4 w-4" />,
			},
			...(isDesktop
				? [
						{ value: "desktop", label: "App Preferences", icon: <Monitor className="h-4 w-4" /> },
						{
							value: "desktop-shortcuts",
							label: "Hotkeys",
							icon: <Keyboard className="h-4 w-4" />,
						},
					]
				: []),
		],
		[t, isDesktop]
	);

	const handleTabClick = (value: string) => {
		router.push(`/dashboard/settings/${value}`);
	};

	const content: Record<string, React.ReactNode> = {
		profile: <ProfileContent />,
		"api-key": <ApiKeyContent />,
		prompts: <PromptsContent />,
		"community-prompts": <CommunityPromptsContent />,
		memory: <MemoryContent />,
		"agent-permissions": <AgentPermissionsContent />,
		"agent-status": <AgentStatusContent />,
		purchases: <PurchaseHistoryContent />,
		desktop: <DesktopContent />,
		"desktop-shortcuts": <DesktopShortcutsContent />,
	};

	const activeLabel = navItems.find((i) => i.value === activeTab)?.label ?? t("title");

	return (
		<div className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 py-6 md:px-8">
			{/* Header */}
			<div className="flex items-center justify-between">
				<div className="flex items-center gap-2">
					<Link
						href="/dashboard"
						className="inline-flex h-8 items-center gap-1 rounded-md px-2 text-sm text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
					>
						<ChevronLeft className="h-4 w-4" />
						Dashboard
					</Link>
					<span className="text-muted-foreground/40">/</span>
					<h1 className="text-base font-semibold">{t("title")}</h1>
				</div>
			</div>

			<div className="flex flex-col gap-6 md:flex-row md:gap-8">
				{/* Sidebar nav (desktop) */}
				<aside className="hidden w-[220px] shrink-0 md:block">
					<nav className="flex flex-col gap-0.5">
						{navItems.map((item) => (
							<button
								key={item.value}
								type="button"
								onClick={() => handleTabClick(item.value)}
								className={cn(
									"flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors text-left",
									activeTab === item.value
										? "bg-primary/10 text-primary"
										: "text-muted-foreground hover:bg-accent/50 hover:text-foreground"
								)}
							>
								{item.icon}
								{item.label}
							</button>
						))}
					</nav>
				</aside>

				{/* Mobile horizontal tabs */}
				<div className="-mx-4 overflow-x-auto md:hidden">
					<div className="flex gap-1 px-4 pb-2">
						{navItems.map((item) => (
							<button
								key={item.value}
								type="button"
								onClick={() => handleTabClick(item.value)}
								className={cn(
									"flex items-center gap-2 whitespace-nowrap rounded-full px-3 py-1.5 text-xs font-medium transition-colors shrink-0",
									activeTab === item.value
										? "bg-primary text-primary-foreground"
										: "text-muted-foreground hover:bg-accent/50 hover:text-foreground"
								)}
							>
								{item.icon}
								{item.label}
							</button>
						))}
					</div>
				</div>

				{/* Content */}
				<main className="min-w-0 flex-1">
					<div className="rounded-2xl border border-border bg-card p-6">
						<h2 className="text-lg font-semibold">{activeLabel}</h2>
						<Separator className="my-4" />
						{content[activeTab] ?? content.profile}
					</div>
				</main>
			</div>
		</div>
	);
}
