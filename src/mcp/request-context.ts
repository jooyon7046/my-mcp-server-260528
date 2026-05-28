import { AsyncLocalStorage } from 'node:async_hooks'

type RequestContext = {
    hfToken?: string
}

const storage = new AsyncLocalStorage<RequestContext>()

export function runWithRequestContext<T>(
    req: Request,
    fn: () => Promise<T> | T
): Promise<T> | T {
    const hfToken = req.headers.get('x-hf-token') ?? undefined
    return storage.run({ hfToken }, fn)
}

export function getHfToken(): string | undefined {
    return storage.getStore()?.hfToken ?? process.env.HF_TOKEN
}
