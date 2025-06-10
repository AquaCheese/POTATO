import React from 'react';

const StatusBar: React.FC<{ resources: { water: number; fertilizer: number; potatoes: number }; status: string }> = ({ resources, status }) => {
    return (
        <div className="status-bar">
            <h2>Status Bar</h2>
            <div>
                <strong>Water:</strong> {resources.water}
            </div>
            <div>
                <strong>Fertilizer:</strong> {resources.fertilizer}
            </div>
            <div>
                <strong>Potatoes:</strong> {resources.potatoes}
            </div>
            <div>
                <strong>Status:</strong> {status}
            </div>
        </div>
    );
};

export default StatusBar;