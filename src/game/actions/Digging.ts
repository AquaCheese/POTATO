import { PotatoField } from '../PotatoField';

export class Digging {
    execute(field: PotatoField) {
        // Dig up 1 potato if available
        if (field['potatoes'] > 0) {
            field.dig(1);
            console.log("You have successfully dug up a potato!");
        } else {
            console.log("There are no potatoes to dig up.");
        }
    }
}