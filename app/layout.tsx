import type { Metadata, Viewport } from "next";
import { MaxWidthWrapper, cn, ThemeProvider } from "@/lib";
import { GoogleTagManager, GoogleAnalytics } from "@next/third-parties/google";
import { Toaster } from "sonner";
import "./globals.css";
import NextTopLoader from "nextjs-toploader";
import { Header } from "@/components/reusables";
import { SchedulerInit } from "@/components/investors/scheduler-init";

export const metadata: Metadata = {
	title: "Angel Investors Directory | AI-Powered Investor Discovery",
	description: "Discover angel investors, their interests, and how to reach out. Automatically updated every 5 minutes with AI-powered data extraction.",
};

export const viewport: Viewport = {
	themeColor: "#000000",
	width: "device-width",
	initialScale: 1,
	maximumScale: 1,
	userScalable: false,
};

export default function RootLayout({
	children,
}: Readonly<{
	children: React.ReactNode;
}>) {
	return (
		<html
			lang="en"
			suppressHydrationWarning>
			<body className={cn("m-auto min-h-screen bg-background bg-center bg-no-repeat scroll-smooth antialiased")}>
				<ThemeProvider
					attribute="class"
					defaultTheme="light"
					enableSystem
					disableTransitionOnChange>
					<NextTopLoader
						color="#000000"
						showSpinner={false}
						easing="ease"
					/>
					<SchedulerInit />
					<Header />
					<MaxWidthWrapper>{children}</MaxWidthWrapper>

					<Toaster
						position="top-right"
						expand={false}
					/>
					<GoogleAnalytics gaId="" />
					<GoogleTagManager gtmId="" />
				</ThemeProvider>
			</body>
		</html>
	);
}
