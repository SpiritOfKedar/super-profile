export function isMongoUnavailable(error: unknown): boolean {
    if (!(error instanceof Error)) {
        return false;
    }

    const name = error.name.toLowerCase();
    const message = error.message.toLowerCase();
    return (
        name.includes("mongoserverselectionerror")
        || name.includes("mongonetwork")
        || message.includes("server selection timed out")
        || message.includes("connection timed out")
    );
}
