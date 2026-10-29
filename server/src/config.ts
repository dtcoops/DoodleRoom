
export function getAllowedOrigins(): string[] {
    return (process.env.CLIENT_ORIGIN ?? 'http://localhost:5173')
        .split(',')
        .map((o) => o.trim());
}
