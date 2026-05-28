export default function HomePage() {
    return (
        <main style={{ padding: '2rem', fontFamily: 'sans-serif', lineHeight: 1.6 }}>
            <h1>MY_MCP_SERVER</h1>
            <p>
                Remote MCP server. Connect from an MCP client (e.g. Cursor) via Streamable
                HTTP transport at <code>/api/mcp</code>.
            </p>
            <p>
                For <code>generate-image</code>, pass your HuggingFace token in the{' '}
                <code>x-hf-token</code> request header.
            </p>
        </main>
    )
}
