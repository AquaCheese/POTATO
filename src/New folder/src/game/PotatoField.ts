export class PotatoField {
    private potatoes: number;
    private waterLevel: number;
    private fertilizerLevel: number;

    constructor() {
        this.potatoes = 0;
        this.waterLevel = 0;
        this.fertilizerLevel = 0;
    }

    public plantPotatoes(amount: number): void {
        this.potatoes += amount;
    }

    public water(amount: number): void {
        this.waterLevel += amount;
    }

    public fertilize(amount: number): void {
        this.fertilizerLevel += amount;
    }

    public dig(amount: number): void {
        if (this.potatoes >= amount) {
            this.potatoes -= amount;
        } else {
            console.log("Not enough potatoes to dig.");
        }
    }

    public getFieldStatus(): string {
        return `Potatoes: ${this.potatoes}, Water Level: ${this.waterLevel}, Fertilizer Level: ${this.fertilizerLevel}`;
    }
}