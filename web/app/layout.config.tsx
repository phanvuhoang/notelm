import type { BaseLayoutProps } from "fumadocs-ui/layouts/shared";
import Image from "next/image";
export const baseOptions: BaseLayoutProps = {
	nav: {
		title: (
			<>
				<Image src="/icon-128.svg" alt="notelm" width={24} height={24} />
				notelm Docs
			</>
		),
	},
	githubUrl: "https://github.com/phanvuhoang/notelm",
};
