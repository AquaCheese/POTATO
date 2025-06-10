import FieldView from './components/FieldView';
import ActionPanel from './components/ActionPanel';
import StatusBar from './components/StatusBar';

export class GameUI {
    private fieldView: any;
    private actionPanel: any;
    private statusBar: any;

    constructor() {
        this.fieldView = new FieldView();
        this.actionPanel = new ActionPanel();
        this.statusBar = new StatusBar();
    }

    public render(fieldState: any, playerState: any): void {
        this.fieldView.render(fieldState);
        this.statusBar.update(playerState);
    }

    public updateActionPanel(actions: string[]): void {
        this.actionPanel.update(actions);
    }

    public onActionSelected(action: string): void {
        // Handle action selection from the action panel
        console.log(`Action selected: ${action}`);
        // Additional logic to handle the action can be added here
    }
}