'use client';

import { useEffect } from 'react';

export function SchedulerInit() {
	useEffect(() => {
		// Initialize scheduler on client mount
		fetch('/api/init').catch(console.error);
	}, []);

	return null;
}

