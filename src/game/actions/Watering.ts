import { PotatoField } from '../PotatoField';

export class Watering {
    execute(field: PotatoField) {
        field.water(1); // Default to watering with 1 unit
    }
}