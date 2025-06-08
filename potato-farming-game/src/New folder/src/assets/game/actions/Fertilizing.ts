import { PotatoField } from '../PotatoField';

export class Fertilizing {
    execute(field: PotatoField) {
        // Logic to fertilize the potato field
        field.fertilize(1); // Default to fertilizing with 1 unit
    }
}