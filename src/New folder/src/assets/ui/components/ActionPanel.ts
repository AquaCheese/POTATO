import React from 'react';
import { PotatoField } from '../../game/PotatoField';
import { Watering } from '../../game/actions/Watering';
import { Fertilizing } from '../../game/actions/Fertilizing';
import { Digging } from '../../game/actions/Digging';

interface ActionPanelProps {
    field: PotatoField;
    onAction: (action: any) => void;
}

const ActionPanel: React.FC<ActionPanelProps> = ({ field, onAction }) => {
    const handleWater = () => {
        const wateringAction = new Watering();
        onAction(wateringAction);
    };

    const handleFertilize = () => {
        const fertilizingAction = new Fertilizing();
        onAction(fertilizingAction);
    };

    const handleDig = () => {
        const diggingAction = new Digging();
        onAction(diggingAction);
    };

    return (
        <div className="action-panel">
            <button onClick={handleWater}>Water</button>
            <button onClick={handleFertilize}>Fertilize</button>
            <button onClick={handleDig}>Dig</button>
        </div>
    );
};

export default ActionPanel;