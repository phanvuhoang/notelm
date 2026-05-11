"use client";

import {
	BookText,
	Bot,
	Brain,
	ChevronLeft,
	CircleUser,
	Earth,
	ImageIcon,
	ListChecks,
	ScanEye,
	UserKey,
} from "lucide-react";
import Link from "next/link";
import dynamic from "next/dynamic";
import { useParams, useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useMemo } from "react";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";

const GeneralSettingsManager = dynamic(
	() =>
		import("@/components/settings/general-settings-manager").then((m) => ({
			default: m.GeneralSettingsManager,
		})),
	{ ssr: false }
);
const AgentModelManager = dynamic(
	() =>
		import("@/components/settings/agent-model-manager").then((m) => ({
			default: m.AgentModelManager,
		})),
	{ ssr: false }
);
const LLMRoleManager = dynamic(
	() =>
		import("@/components/settings/llm-role-manager").then((m) => ({ default: m.LLMRoleManager })),
	{ ssr: false }
);
const ImageModelManager = dynamic(
	() =>
		import("@/components/settings/image-model-manager").then((m) => ({
			default: m.ImageModelManager,
		})),
	{ ssr: false }
);
const VisionModelManager = dynamic(
	() =>
		import("@/components/settings/vision-model-manager").then((m) => ({
			default: m.VisionModelManager,
		})),
	{ ssr: false }
);
const RolesManager = dynamic(
	() => import("@/components/settings/roles-manager").then((m) => ({ default: m.RolesManager })),
	{ ssr: false }
);
const PromptConfigManager = dynamic(
	() =>
		import("@/components/settings/prompt-config-manager").then((m) => ({
			default: m.PromptConfigManager,
		})),
	{ ssr: false }
);
const PublicChatSnapshotsManager = dynamic(
	() =>
		import("@/components/public-chat-snapshots/public-chat-snapshots-manager").then((m) => ({
			default: m.PublicChatSnapshotsManager,
		})),
	{ ssr: false }
);
const TeamMemoryManager = dynamic(
	() =>
		import("@/components/settings/team-memory-manager").then((m) => ({
			default: m.TeamMemoryManager,
		})),
	{ ssr: false }
);

export default function WorkspaceSettingsPage() {
	const t = useTranslations("searchSpaceSettings");
	const router = useRouter();
	const params = useParams<{ search_space_id: string; tab?: string[] }>();

	const searchSpaceId = Number(params?.search_space_id);
	const activeTab = (params?.tab && params.tab[0]) || "general";

	const navItems = useMemo(
		() => [
			{ value: "general", label: t("nav_general"), icon: <CircleUser className="h-4 w-4" /> },
			{ value: "roles", label: t("nav_role_assignments"), icon: <ListChecks className="h-4 w-4" /> },
			{ value: "models", label: t("nav_agent_models"), icon: <Bot className="h-4 w-4" /> },
			{
				value: "image-models",
				label: t("nav_image_models"),
				icon: <ImageIcon className="h-4 w-4" />,
			},
			{
				value: "vision-models",
				label: t("nav_vision_models"),
				icon: <ScanEye className="h-4 w-4" />,
			},
			{ value: "team-roles", label: t("nav_team_roles"), icon: <UserKey className="h-4 w-4" /> },
			{
				value: "prompts",
				label: t("nav_system_instructions"),
				icon: <BookText className="h-4 w-4" />,
			},
			{ value: "team-memory", label: "Team Memory", icon: <Brain className="h-4 w-4" /> },
			{
				value: "public-links",
				label: t("nav_public_links"),
				icon: <Earth className="h-4 w-4" />,
			},
		],
		[t]
	);

	const handleTabClick = (value: string) => {
		router.push(`/dashboard/${searchSpaceId}/settings/${value}`);
	};

	const content: Record<string, React.ReactNode> = {
		general: <GeneralSettingsManager searchSpaceId={searchSpaceId} />,
		models: <AgentModelManager searchSpaceId={searchSpaceId} />,
		roles: <LLMRoleManager key={searchSpaceId} searchSpaceId={searchSpaceId} />,
		"image-models": <ImageModelManager searchSpaceId={searchSpaceId} />,
		"vision-models": <VisionModelManager searchSpaceId={searchSpaceId} />,
		"team-roles": <RolesManager searchSpaceId={searchSpaceId} />,
		prompts: <PromptConfigManager searchSpaceId={searchSpaceId} />,
		"team-memory": <TeamMemoryManager searchSpaceId={searchSpaceId} />,
		"public-links": <PublicChatSnapshotsManager searchSpaceId={searchSpaceId} />,
	};

	const activeLabel = navItems.find((i) => i.value === activeTab)?.label ?? t("title");

	return (
		<div className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 py-6 md:px-8">
			<div className="flex items-center gap-2">
				<Link
					href={`/dashboard/${searchSpaceId}/new-chat`}
					className="inline-flex h-8 items-center gap-1 rounded-md px-2 text-sm text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
				>
					<ChevronLeft className="h-4 w-4" />
					Workspace
				</Link>
				<span className="text-muted-foreground/40">/</span>
				<h1 className="text-base font-semibold">{t("title")}</h1>
			</div>

			<div className="flex flex-col gap-6 md:flex-row md:gap-8">
				<aside className="hidden w-[240px] shrink-0 md:block">
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

				<main className="min-w-0 flex-1">
					<div className="rounded-2xl border border-border bg-card p-6">
						<h2 className="text-lg font-semibold">{activeLabel}</h2>
						<Separator className="my-4" />
						{Number.isFinite(searchSpaceId)
							? content[activeTab] ?? content.general
							: null}
					</div>
				</main>
			</div>
		</div>
	);
}
