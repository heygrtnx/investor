import type { Metadata, Viewport } from "next";
import { MaxWidthWrapper, cn, ThemeProvider } from "@/lib";
import { GoogleTagManager, GoogleAnalytics } from "@next/third-parties/google";
import { Toaster } from "sonner";
import "./globals.css";
import NextTopLoader from "nextjs-toploader";
import { Header, SponsorButton, OfflineNotification } from "@/components/reusables";
import { ServiceWorkerRegister } from "@/components/reusables/service-worker-register";

export const metadata: Metadata = {
	title: "AI Investor Finder | Find Perfect Angel Investors for Your Startup",
	description: "AI-powered investor discovery platform. Describe your startup and find matching angel investors instantly. Real-time data, smart matching, beautiful interface.",
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
			<body className={cn("m-auto min-h-screen bg-background bg-center bg-no-repeat scroll-smooth antialiased overflow-x-hidden")}>
				<ThemeProvider
					attribute="class"
					defaultTheme="light"
					enableSystem
					disableTransitionOnChange>
					<ServiceWorkerRegister />
					<OfflineNotification />
					<NextTopLoader
						color="#000000"
						showSpinner={false}
						easing="ease"
					/>
					{children}
					<SponsorButton />

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
