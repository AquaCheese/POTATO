export interface Action {
    type: string;
    execute(field: PotatoField): void;
}

export interface FieldState {
    isWatered: boolean;
    isFertilized: boolean;
    hasPotatoes: boolean;
    potatoCount: number;
}

export interface PlayerState {
    resources: number;
    actionsPerformed: number;
}