export class Player {
    private resources: number;

    constructor() {
        this.resources = 0; // Initialize resources
    }

    public collectResources(amount: number): void {
        this.resources += amount; // Collect resources
    }

    public performAction(action: string): void {
        // Logic to perform the action based on the action string
        console.log(`Performing action: ${action}`);
    }

    public getResources(): number {
        return this.resources; // Get current resources
    }
}