"use client";

/**
 * InlinePanel — drop-in replacement for shadcn Dialog/DialogContent that
 * renders the panel INLINE inside the page flow (no portal, no fixed
 * positioning). Use when the user expects to see the form expand directly
 * below a button instead of opening a floating modal.
 *
 * API mirrors shadcn Dialog so existing config-dialog components can swap
 * `<Dialog>` → `<InlinePanel>` and `<DialogContent>` → `<InlinePanelContent>`
 * with minimal changes.
 */

import { X } from "lucide-react";
import * as React from "react";
import { cn } from "@/lib/utils";

type InlinePanelProps = {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	children: React.ReactNode;
};

const InlinePanelCtx = React.createContext<{
	onOpenChange: (open: boolean) => void;
} | null>(null);

export function InlinePanel({ open, onOpenChange, children }: InlinePanelProps) {
	if (!open) return null;
	return (
		<InlinePanelCtx.Provider value={{ onOpenChange }}>
			<div className="w-full">{children}</div>
		</InlinePanelCtx.Provider>
	);
}

type InlinePanelContentProps = React.HTMLAttributes<HTMLDivElement> & {
	// Accept and ignore Radix-style props so existing call-sites compile
	onOpenAutoFocus?: (e: Event) => void;
	onEscapeKeyDown?: (e: KeyboardEvent) => void;
	onPointerDownOutside?: (e: Event) => void;
	onInteractOutside?: (e: Event) => void;
};

export const InlinePanelContent = React.forwardRef<HTMLDivElement, InlinePanelContentProps>(
	(
		{
			className,
			children,
			onOpenAutoFocus: _o,
			onEscapeKeyDown: _e,
			onPointerDownOutside: _p,
			onInteractOutside: _i,
			...props
		},
		ref
	) => {
		const ctx = React.useContext(InlinePanelCtx);
		return (
			<div
				ref={ref}
				className={cn(
					// Reset positioning that the original Dialog version used.
					// Make it a normal block element flowing inside the page.
					// Replace fixed/inset/transform with simple block styles.
					"relative w-full max-w-3xl mx-auto my-4 rounded-xl border bg-background dark:bg-neutral-900 shadow-sm",
					// Strip any incoming positional classes by overriding common ones via order.
					className
						?.replace(/h-\[\d+vh\]/g, "")
						.replace(/max-h-\[\d+vh\]/g, "")
						.replace(/max-w-\w+/g, "")
						.replace(/overflow-hidden/g, "")
						.replace(/\bp-0\b/g, "")
						.replace(/\bgap-0\b/g, "")
				)}
				{...props}
			>
				{children}
				<button
					type="button"
					aria-label="Close"
					onClick={() => ctx?.onOpenChange(false)}
					className="absolute right-3 top-3 z-10 h-8 w-8 rounded-full inline-flex items-center justify-center text-muted-foreground transition-colors hover:text-foreground hover:bg-accent"
				>
					<X className="h-4 w-4" />
				</button>
			</div>
		);
	}
);
InlinePanelContent.displayName = "InlinePanelContent";

// Title is rendered just for a11y (kept invisible) — caller usually has its
// own visible header inside the content body.
export const InlinePanelTitle = React.forwardRef<
	HTMLHeadingElement,
	React.HTMLAttributes<HTMLHeadingElement>
>(({ className, ...props }, ref) => (
	<h2 ref={ref} className={cn("text-lg font-semibold leading-none", className)} {...props} />
));
InlinePanelTitle.displayName = "InlinePanelTitle";

export const InlinePanelHeader = ({
	className,
	...props
}: React.HTMLAttributes<HTMLDivElement>) => (
	<div className={cn("flex flex-col space-y-1.5", className)} {...props} />
);
InlinePanelHeader.displayName = "InlinePanelHeader";

export const InlinePanelDescription = React.forwardRef<
	HTMLParagraphElement,
	React.HTMLAttributes<HTMLParagraphElement>
>(({ className, ...props }, ref) => (
	<p ref={ref} className={cn("text-sm text-muted-foreground", className)} {...props} />
));
InlinePanelDescription.displayName = "InlinePanelDescription";
