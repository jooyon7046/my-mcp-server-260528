import type { ReactNode } from 'react'

export const metadata = {
    title: 'MY_MCP_SERVER',
    description: 'Remote MCP server deployed on Vercel'
}

export default function RootLayout({ children }: { children: ReactNode }) {
    return (
        <html lang="ko">
            <body>{children}</body>
        </html>
    )
}
