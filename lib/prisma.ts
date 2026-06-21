import { PrismaClient } from '@prisma/client'

const prismaClientSingleton = () => {
  return new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
    // Note: SQLite doesn't support traditional connection pooling,
    // but we can optimize query timeouts for high traffic.
  })
}

declare global {
  var prismaGlobal: undefined | ReturnType<typeof prismaClientSingleton>
}

// In Next.js dev, we use a global variable to preserve the Prisma instance
// across hot-reloads.
const getPrisma = () => {
  if (process.env.NODE_ENV !== 'production') {
    if (!globalThis.prismaGlobal) {
      globalThis.prismaGlobal = prismaClientSingleton()
    }
    return globalThis.prismaGlobal
  }

  // Production singleton
  if (!globalThis.prismaGlobal) {
    globalThis.prismaGlobal = prismaClientSingleton()
  }
  return globalThis.prismaGlobal
}

export const prisma = getPrisma()

// Bulletproof Query Wrapper: Retries once on transient failures
export async function prismaRetry<T>(queryFn: () => Promise<T>, retries = 2): Promise<T> {
  let lastError: any;
  for (let i = 0; i < retries; i++) {
    try {
      return await queryFn();
    } catch (error: any) {
      lastError = error;
      // Only retry on connection or timeout errors (common in high traffic)
      if (error.message?.includes('connection') || error.message?.includes('timeout') || error.message?.includes('pool')) {
        console.warn(`[Prisma] Transient error detected, retrying (${i + 1}/${retries})...`);
        await new Promise(resolve => setTimeout(resolve, 200)); // Small jitter
        continue;
      }
      throw error; // If it's a code/logic error, don't retry
    }
  }
  throw lastError;
}
