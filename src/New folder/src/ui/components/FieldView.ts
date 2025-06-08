import React from 'react';
import { PotatoField } from '../../game/PotatoField';

interface FieldViewProps {
    field: PotatoField;
}

const FieldView: React.FC<FieldViewProps> = ({ field }) => {
    return (
        <div className="field-view">
            <h2>Potato Field Status</h2>
            <p>Soil Moisture: {field.soilMoisture}</p>
            <p>Fertilizer Level: {field.fertilizerLevel}</p>
            <p>Potato Count: {field.potatoCount}</p>
            <p>Field Condition: {field.condition}</p>
        </div>
    );
};

export default FieldView;