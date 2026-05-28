import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js'
import { InferenceClient } from '@huggingface/inference'
import { z } from 'zod'

// Create server instance
const server = new McpServer({
    name: 'YOUR_SERVER_NAME',
    version: '1.0.0'
})

server.registerTool(
    'greet',
    {
        description: '이름과 언어를 입력하면 인사말을 반환합니다.',
        inputSchema: z.object({
            name: z.string().describe('인사할 사람의 이름'),
            language: z
                .enum(['ko', 'en'])
                .optional()
                .default('en')
                .describe('인사 언어 (기본값: en)')
        }),
        outputSchema: z.object({
            content: z
                .array(
                    z.object({
                        type: z.literal('text'),
                        text: z.string().describe('인사말')
                    })
                )
                .describe('인사말')
        })
    },
    async ({ name, language }) => {
        const greeting =
            language === 'ko'
                ? `안녕하세요, ${name}님!`
                : `Hey there, ${name}! 👋 Nice to meet you!`

        return {
            content: [
                {
                    type: 'text' as const,
                    text: greeting
                }
            ],
            structuredContent: {
                content: [
                    {
                        type: 'text' as const,
                        text: greeting
                    }
                ]
            }
        }
    }
)

server.registerTool(
    'calculate',
    {
        description: '두 숫자와 연산자를 입력하면 사칙연산 결과를 반환합니다.',
        inputSchema: z.object({
            operator: z
                .enum(['+', '-', '*', '/'])
                .describe('연산자 (+, -, *, /)'),
            a: z.number().describe('첫 번째 숫자'),
            b: z.number().describe('두 번째 숫자')
        }),
        outputSchema: z.object({
            content: z
                .array(
                    z.object({
                        type: z.literal('text'),
                        text: z.string().describe('계산 결과')
                    })
                )
                .describe('계산 결과')
        })
    },
    async ({ operator, a, b }) => {
        let result: number

        if (operator === '+') result = a + b
        else if (operator === '-') result = a - b
        else if (operator === '*') result = a * b
        else {
            if (b === 0) {
                const errorText = '오류: 0으로 나눌 수 없습니다.'
                return {
                    content: [{ type: 'text' as const, text: errorText }],
                    structuredContent: {
                        content: [{ type: 'text' as const, text: errorText }]
                    }
                }
            }
            result = a / b
        }

        const text = `${a} ${operator} ${b} = ${result}`
        return {
            content: [{ type: 'text' as const, text }],
            structuredContent: {
                content: [{ type: 'text' as const, text }]
            }
        }
    }
)

server.registerTool(
    'get_time',
    {
        description: '현재 날짜와 시간을 반환합니다.',
        inputSchema: z.object({
            timezone: z
                .string()
                .optional()
                .default('Asia/Seoul')
                .describe('타임존 (기본값: Asia/Seoul, 예: UTC, America/New_York)')
        }),
        outputSchema: z.object({
            content: z
                .array(
                    z.object({
                        type: z.literal('text'),
                        text: z.string().describe('현재 날짜 및 시간')
                    })
                )
                .describe('현재 날짜 및 시간')
        })
    },
    async ({ timezone }) => {
        const now = new Date()
        const text = now.toLocaleString('ko-KR', {
            timeZone: timezone,
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
            hour12: false
        })

        return {
            content: [{ type: 'text' as const, text: `현재 시간: ${text} (${timezone})` }],
            structuredContent: {
                content: [{ type: 'text' as const, text: `현재 시간: ${text} (${timezone})` }]
            }
        }
    }
)

server.registerTool(
    'geocode_city',
    {
        description: '도시 이름을 입력하면 위도와 경도 좌표를 반환합니다.',
        inputSchema: z.object({
            city: z.string().describe('도시 이름 (예: Seoul, 서울, Hanoi)'),
            language: z
                .enum(['ko', 'en'])
                .optional()
                .default('ko')
                .describe('결과 언어 (기본값: ko)')
        }),
        outputSchema: z.object({
            content: z
                .array(
                    z.object({
                        type: z.literal('text'),
                        text: z.string().describe('위도/경도 좌표 정보')
                    })
                )
                .describe('위도/경도 좌표 정보')
        })
    },
    async ({ city, language }) => {
        const makeText = (text: string) => ({
            content: [{ type: 'text' as const, text }],
            structuredContent: { content: [{ type: 'text' as const, text }] }
        })

        try {
            const url = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(city)}&count=1&language=${language}&format=json`
            const response = await fetch(url)

            if (!response.ok) {
                return makeText(`오류: 지오코딩 API 요청 실패 (${response.status})`)
            }

            const data = (await response.json()) as {
                results?: { name: string; country: string; latitude: number; longitude: number }[]
            }

            if (!data.results || data.results.length === 0) {
                return makeText(`오류: '${city}' 위치를 찾을 수 없습니다.`)
            }

            const { name, country, latitude, longitude } = data.results[0]
            const text = `${name} (${country}) → 위도 ${latitude.toFixed(4)}, 경도 ${longitude.toFixed(4)}`
            return makeText(text)
        } catch (e) {
            return makeText(`오류: 좌표 정보를 가져오지 못했습니다 (${(e as Error).message})`)
        }
    }
)

server.registerTool(
    'get_weather',
    {
        description: '위도와 경도를 입력하면 현재 날씨 정보를 반환합니다.',
        inputSchema: z.object({
            latitude: z.number().min(-90).max(90).describe('위도 (-90 ~ 90)'),
            longitude: z.number().min(-180).max(180).describe('경도 (-180 ~ 180)')
        }),
        outputSchema: z.object({
            content: z
                .array(
                    z.object({
                        type: z.literal('text'),
                        text: z.string().describe('현재 날씨 정보')
                    })
                )
                .describe('현재 날씨 정보')
        })
    },
    async ({ latitude, longitude }) => {
        const makeText = (text: string) => ({
            content: [{ type: 'text' as const, text }],
            structuredContent: { content: [{ type: 'text' as const, text }] }
        })

        const wmoCodeMap: Record<number, string> = {
            0: '맑음',
            1: '대체로 맑음', 2: '구름 조금', 3: '흐림',
            45: '안개', 48: '안개(결빙)',
            51: '가벼운 이슬비', 53: '이슬비', 55: '강한 이슬비',
            61: '가벼운 비', 63: '비', 65: '강한 비',
            66: '가벼운 어는비', 67: '어는비',
            71: '가벼운 눈', 73: '눈', 75: '강한 눈', 77: '싸락눈',
            80: '소나기', 81: '강한 소나기', 82: '매우 강한 소나기',
            85: '약한 눈 소나기', 86: '강한 눈 소나기',
            95: '뇌우', 96: '뇌우(약한 우박)', 99: '뇌우(강한 우박)'
        }

        try {
            const url = `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current=temperature_2m,relative_humidity_2m,weather_code,wind_speed_10m&timezone=auto`
            const response = await fetch(url)

            if (!response.ok) {
                return makeText(`오류: 날씨 API 요청 실패 (${response.status})`)
            }

            const data = (await response.json()) as {
                current: {
                    temperature_2m: number
                    relative_humidity_2m: number
                    weather_code: number
                    wind_speed_10m: number
                }
            }

            const { temperature_2m, relative_humidity_2m, weather_code, wind_speed_10m } = data.current
            const condition = wmoCodeMap[weather_code] ?? `기타(코드 ${weather_code})`
            const text = `현재 날씨 (${latitude.toFixed(2)}, ${longitude.toFixed(2)}): ${condition}, 기온 ${temperature_2m}°C, 습도 ${relative_humidity_2m}%, 풍속 ${wind_speed_10m} m/s`
            return makeText(text)
        } catch (e) {
            return makeText(`오류: 날씨 정보를 가져오지 못했습니다 (${(e as Error).message})`)
        }
    }
)

server.registerTool(
    'generate-image',
    {
        description:
            '텍스트 프롬프트를 입력하면 FLUX.1-schnell 모델로 이미지를 생성합니다.',
        inputSchema: z.object({
            prompt: z.string().describe('이미지 생성 프롬프트'),
            num_inference_steps: z
                .number()
                .int()
                .min(1)
                .max(10)
                .optional()
                .default(4)
                .describe('추론 스텝 수 (1~10, 기본값 4)')
        })
    },
    async ({ prompt, num_inference_steps }) => {
        const token = process.env.HF_TOKEN

        if (!token) {
            const errorText = '오류: HF_TOKEN 환경변수가 설정되어 있지 않습니다.'
            return {
                content: [{ type: 'text' as const, text: errorText }]
            }
        }

        try {
            const client = new InferenceClient(token)
            const image = await client.textToImage(
                {
                    provider: 'together',
                    model: 'black-forest-labs/FLUX.1-schnell',
                    inputs: prompt,
                    parameters: { num_inference_steps }
                },
                { outputType: 'blob' }
            )

            const arrayBuffer = await image.arrayBuffer()
            const base64 = Buffer.from(arrayBuffer).toString('base64')

            return {
                content: [
                    {
                        type: 'image' as const,
                        data: base64,
                        mimeType: 'image/png'
                    }
                ]
            }
        } catch (e) {
            return {
                content: [
                    {
                        type: 'text' as const,
                        text: `오류: 이미지 생성 실패 (${(e as Error).message})`
                    }
                ]
            }
        }
    }
)

server.registerPrompt(
    'code-review',
    {
        title: 'Code Review',
        description: '코드를 입력받아 베스트 프랙티스에 따라 코드 리뷰를 수행하는 프롬프트 템플릿입니다.',
        argsSchema: {
            code: z.string().describe('리뷰할 코드'),
            language: z
                .string()
                .optional()
                .describe('프로그래밍 언어 (예: TypeScript, Python, Java). 미입력 시 자동 감지'),
            focus: z
                .enum(['all', 'security', 'performance', 'readability', 'architecture'])
                .optional()
                .default('all')
                .describe('리뷰 집중 영역 (기본값: all)')
        }
    },
    ({ code, language, focus }) => {
        const langInfo = language ? `언어: **${language}**\n` : ''
        const focusMap: Record<string, string> = {
            all: '전반적인 코드 품질',
            security: '보안 취약점',
            performance: '성능 최적화',
            readability: '가독성 및 유지보수성',
            architecture: '아키텍처 및 설계 패턴'
        }
        const focusLabel = focusMap[focus ?? 'all']

        const text = `당신은 시니어 소프트웨어 엔지니어입니다. 아래 코드를 **${focusLabel}** 관점에서 철저히 리뷰해주세요.
${langInfo}
---

\`\`\`
${code}
\`\`\`

---

다음 항목을 기준으로 리뷰해주세요:

## 1. 코드 품질
- 네이밍 컨벤션이 일관적이고 의미있는지
- 함수/클래스가 단일 책임 원칙(SRP)을 따르는지
- 중복 코드(DRY 원칙 위반)가 있는지

## 2. 잠재적 버그 및 에러 처리
- null/undefined 처리가 적절한지
- 예외 처리가 충분한지
- 엣지 케이스가 고려되었는지

## 3. 보안
- 입력값 검증이 이루어지는지
- 민감한 정보 노출 위험이 있는지
- SQL 인젝션, XSS 등 주요 취약점 여부

## 4. 성능
- 불필요한 연산이나 반복이 있는지
- 메모리 누수 가능성이 있는지
- 더 효율적인 알고리즘/자료구조로 대체 가능한지

## 5. 가독성 및 유지보수성
- 복잡한 로직에 주석이 있는지
- 함수/모듈이 적절한 크기인지
- 테스트하기 쉬운 구조인지

---

리뷰 결과는 아래 형식으로 작성해주세요:

### 총평
(전반적인 코드 품질 평가)

### 발견된 문제점
(심각도: 🔴 높음 / 🟡 중간 / 🟢 낮음)

### 개선 제안
(구체적인 코드 예시 포함)

### 잘된 점
(긍정적인 부분)
`

        return {
            messages: [
                {
                    role: 'user' as const,
                    content: {
                        type: 'text' as const,
                        text
                    }
                }
            ]
        }
    }
)

server.registerResource(
    'server-info',
    'info://server',
    {
        mimeType: 'application/json'
    },
    async (uri: URL) => {
        const info = {
            name: 'MY_MCP_SERVER',
            version: '1.0.0',
            description: '다양한 기능을 제공하는 MCP 서버입니다.',
            tools: [
                {
                    name: 'greet',
                    description: '이름과 언어를 입력하면 인사말을 반환합니다.'
                },
                {
                    name: 'calculate',
                    description: '두 숫자와 연산자를 입력하면 사칙연산 결과를 반환합니다.'
                },
                {
                    name: 'get_time',
                    description: '현재 날짜와 시간을 반환합니다.'
                },
                {
                    name: 'geocode_city',
                    description: '도시 이름을 입력하면 위도와 경도 좌표를 반환합니다.'
                },
                {
                    name: 'get_weather',
                    description: '위도와 경도를 입력하면 현재 날씨 정보를 반환합니다.'
                }
            ],
            resources: [
                {
                    name: 'server-info',
                    uri: 'info://server',
                    description: 'MCP 서버 정보를 반환합니다.'
                }
            ],
            createdAt: '2026-05-28'
        }

        return {
            contents: [
                {
                    uri: uri.href,
                    mimeType: 'application/json',
                    text: JSON.stringify(info, null, 2)
                }
            ]
        }
    }
)

server
    .connect(new StdioServerTransport())
    .catch(console.error)
    .then(() => {
        console.log('MCP server started')
    })
