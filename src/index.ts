import { GameEngine } from './game/GameEngine';
import { GameUI } from './ui/GameUI';
import { Player } from './game/Player';
import { PotatoField } from './game/PotatoField';

const player = new Player();
const potatoField = new PotatoField();
const gameEngine = new GameEngine(player, potatoField);
const gameUI = new GameUI();

function startGame() {
    gameEngine.start();
    gameUI.render(potatoField, player);
}

startGame();