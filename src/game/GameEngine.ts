import { PotatoField } from './PotatoField';
import { Player } from './Player';
import { Action } from '../types';
import { Watering } from './actions/Watering';
import { Fertilizing } from './actions/Fertilizing';
import { Digging } from './actions/Digging';

export class GameEngine {
    private isRunning: boolean;
    private potatoField: PotatoField;
    private player: Player;

    constructor(player: Player, potatoField: PotatoField) {
        this.player = player;
        this.potatoField = potatoField;
        this.isRunning = false;
    }

    public start(): void {
        this.isRunning = true;
        this.gameLoop();
    }

    private gameLoop(): void {
        if (!this.isRunning) return;

        this.update();
        requestAnimationFrame(() => this.gameLoop());
    }

    public update(): void {
        // Update game state logic here
    }

    public handleAction(action: Action): void {
        switch (action.type) {
            case 'WATER':
                new Watering().execute(this.potatoField);
                break;
            case 'FERTILIZE':
                new Fertilizing().execute(this.potatoField);
                break;
            case 'DIG':
                new Digging().execute(this.potatoField);
                break;
            default:
                console.error('Unknown action type:', action.type);
        }
    }

    public stop(): void {
        this.isRunning = false;
    }
}