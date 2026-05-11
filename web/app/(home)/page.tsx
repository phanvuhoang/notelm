import { redirect } from "next/navigation";

// notelm: landing page redirects straight to the dashboard.
// Old SurfSense marketing homepage is removed.
export default function HomePage() {
	redirect("/dashboard");
}
