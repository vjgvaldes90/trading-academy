/**
 * Shared Access Code generation for academy students.
 * Same algorithm historically used by webhook / provision / create-user.
 */

export function generateAccessCode(): string {
    return Math.random().toString(36).substring(2, 8).toUpperCase()
}
