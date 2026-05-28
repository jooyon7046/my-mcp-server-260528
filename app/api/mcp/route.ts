import { createMcpHandler } from 'mcp-handler'
import { registerMcpServer } from '@/src/mcp/register-server'
import { runWithRequestContext } from '@/src/mcp/request-context'

export const runtime = 'nodejs'
export const maxDuration = 60

const handler = createMcpHandler(
    (server) => {
        registerMcpServer(server)
    },
    {
        serverInfo: { name: 'MY_MCP_SERVER', version: '1.0.0' }
    },
    { basePath: '/api' }
)

const wrapped = (req: Request) => runWithRequestContext(req, () => handler(req))

export { wrapped as GET, wrapped as POST, wrapped as DELETE }
