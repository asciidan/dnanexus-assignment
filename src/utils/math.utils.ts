export class MathUtils {
    /**
     * Get the base 2 logarithm of a number if it is an integer
     */
    public static getIntegerBase2Log(value: number): number | null {
        const result = Math.log2(value);
        return Number.isInteger(result) ? result : null;
    }
}
