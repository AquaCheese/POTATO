export function getRandomInt(min: number, max: number): number {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

export function formatResourceCount(count: number): string {
    return count.toLocaleString();
}

export function logAction(action: string): void {
    console.log(`Action performed: ${action}`);
}