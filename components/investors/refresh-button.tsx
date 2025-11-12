'use client';

import { motion } from 'framer-motion';
import { RefreshCw } from 'lucide-react';
import { Button } from '@heroui/react';
import { useState } from 'react';
import { toast } from 'sonner';

export function RefreshButton() {
	const [isLoading, setIsLoading] = useState(false);

	const handleRefresh = async () => {
		setIsLoading(true);
		try {
			const response = await fetch('/api/scrape', {
				method: 'POST',
			});
			const data = await response.json();
			
			if (response.ok) {
				toast.success('Scraping job triggered! Data will update shortly.');
				// Reload the page after a short delay to show new data
				setTimeout(() => {
					window.location.reload();
				}, 2000);
			} else {
				toast.error('Failed to trigger scraping job');
			}
		} catch (error) {
			console.error('Error triggering scrape:', error);
			toast.error('Failed to trigger scraping job');
		} finally {
			setIsLoading(false);
		}
	};

	return (
		<motion.div
			initial={{ opacity: 0, scale: 0.9 }}
			animate={{ opacity: 1, scale: 1 }}
			transition={{ duration: 0.5, delay: 0.3 }}
			whileHover={{ scale: 1.05 }}
			whileTap={{ scale: 0.95 }}>
			<Button
				onClick={handleRefresh}
				color="primary"
				variant="flat"
				isLoading={isLoading}
				startContent={
					!isLoading ? (
						<motion.div
							animate={{ rotate: [0, 360] }}
							transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}>
							<RefreshCw className="w-4 h-4" />
						</motion.div>
					) : undefined
				}
				className="w-full sm:w-auto bg-gradient-to-r from-purple-600 to-blue-600 text-white shadow-lg hover:shadow-xl transition-all">
				{isLoading ? 'Refreshing...' : 'Refresh Now'}
			</Button>
		</motion.div>
	);
}

