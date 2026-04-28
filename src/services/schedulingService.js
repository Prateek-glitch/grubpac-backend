/**
 * Dynamically determines the active content based on a continuous time loop.
 */
const getActiveContent = (contentItems) => {
    if (!contentItems || contentItems.length === 0) return null;

    const now = new Date();

    // 1. Filter by valid time window
    const activeWindowItems = contentItems.filter(item => {
        if (!item.start_time || !item.end_time) return false;
        const start = new Date(item.start_time);
        const end = new Date(item.end_time);
        return now >= start && now <= end;
    });

    if (activeWindowItems.length === 0) return null;

    // 2. Sort to ensure consistent rotation order
    activeWindowItems.sort((a, b) => a.id - b.id);

    // 3. Calculate total loop duration in milliseconds
    const totalLoopMs = activeWindowItems.reduce((sum, item) => {
        // Default duration to 5 minutes if not explicitly set in schedule
        const durationMins = item.duration || 5; 
        return sum + (durationMins * 60 * 1000);
    }, 0);

    if (totalLoopMs === 0) return activeWindowItems[0];

    // 4. Determine current position in the loop based on a fixed epoch (start of day)
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    const timePassedMs = now.getTime() - startOfDay;
    const currentPositionMs = timePassedMs % totalLoopMs;

    // 5. Find the specific content item that maps to the current time remainder
    let accumulatedMs = 0;
    for (let item of activeWindowItems) {
        const itemDurationMs = (item.duration || 5) * 60 * 1000;
        if (currentPositionMs >= accumulatedMs && currentPositionMs < accumulatedMs + itemDurationMs) {
            return item;
        }
        accumulatedMs += itemDurationMs;
    }

    return activeWindowItems[0]; // Safe fallback
};

module.exports = { getActiveContent };