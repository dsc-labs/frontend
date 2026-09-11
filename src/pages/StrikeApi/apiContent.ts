export type ApiLanguage = 'curl' | 'python' | 'node'

export type ApiCodeSample = {
  id: ApiLanguage
  label: string
  code: string
}

export type ApiCapability = {
  id: 'generate' | 'track' | 'retrieve'
  title: string
  description: string
  meta: string
}

export type ApiStep = {
  number: string
  method: string
  methodTone: 'post' | 'stream' | 'get'
  title: string
  description: string
}

export type ApiSecurityFeature = {
  id: 'auth' | 'scope' | 'retry' | 'credits'
  title: string
  description: string
}

export type ApiEndpoint = {
  method: 'GET' | 'POST'
  path: string
  description: string
}

const API_BASE = 'https://strikerobot.ai/sr-platform/app/api/v1'

export const HERO_QUICKSTART = [
  '# Create an environment generation operation',
  `curl --fail-with-body -X POST "${API_BASE}/environments" \\`,
  '  -H "Authorization: Bearer your_api_key_here" \\',
  "  -H \"Idempotency-Key: $(python3 -c 'import uuid; print(uuid.uuid4())')\" \\",
  '  -H "Content-Type: application/json" \\',
  "  --data '{",
  '    "prompt": "Create a warehouse aisle with inspection markers.",',
  '    "robotId": "inspection_cart",',
  '    "model": "venice/openai-gpt-54-mini",',
  '    "useForge": true',
  "  }'",
  '',
  '# Response: HTTP 202 Accepted',
  '{ "id": "op_01J8Y0K72Q9T3V6M4R2S1N5P8A",',
  '  "type": "environment.create", "status": "queued", "creditCost": 25 }',
].join('\n')

export const API_LANGUAGES: ApiLanguage[] = ['curl', 'python', 'node']

export const API_CODE_SAMPLES: Record<ApiLanguage, ApiCodeSample> = {
  curl: {
    id: 'curl',
    label: 'cURL',
    code: [
      '# Poll until status is completed, failed, or cancelled',
      `curl --fail-with-body "${API_BASE}/operations/op_01J8Y0K72Q9T3V6M4R2S1N5P8A" \\`,
      '  -H "Authorization: Bearer your_api_key_here"',
      '',
      '# A completed operation contains download URLs',
      '{',
      '  "id": "op_01J8Y0K72Q9T3V6M4R2S1N5P8A",',
      '  "type": "environment.create",',
      '  "status": "completed",',
      '  "creditCost": 25,',
      '  "result": {',
      '    "id": "env_01J8Y0R25M6T4Q9S7N3P1K8V2C",',
      '    "type": "environment",',
      '    "contentUrl": "/v1/environments/env_01J8Y0R25M6T4Q9S7N3P1K8V2C/content"',
      '  }',
      '}',
    ].join('\n'),
  },
  python: {
    id: 'python',
    label: 'Python',
    code: [
      'import requests',
      '',
      `url = "${API_BASE}/operations/"`,
      'operation_id = "op_01J8Y0K72Q9T3V6M4R2S1N5P8A"',
      'response = requests.get(',
      '    url + operation_id,',
      '    headers={"Authorization": "Bearer your_api_key_here"},',
      '    timeout=30,',
      ')',
      'response.raise_for_status()',
      'operation = response.json()',
      'print(operation["status"])',
      'if operation["status"] == "completed":',
      '    print(operation["result"]["contentUrl"])',
    ].join('\n'),
  },
  node: {
    id: 'node',
    label: 'Node.js',
    code: [
      `const base = "${API_BASE}";`,
      'const operationId = "op_01J8Y0K72Q9T3V6M4R2S1N5P8A";',
      'const response = await fetch(`${base}/operations/${operationId}`, {',
      '  headers: { Authorization: "Bearer your_api_key_here" },',
      '});',
      'if (!response.ok) throw new Error(`HTTP ${response.status}`);',
      'const operation = await response.json();',
      'console.log(operation.status);',
      'if (operation.status === "completed") {',
      '  console.log(operation.result.contentUrl);',
      '}',
    ].join('\n'),
  },
}

export const API_CAPABILITIES: ApiCapability[] = [
  {
    id: 'generate',
    title: 'Generate environments and assets',
    description:
      'Create environments from prompts. Create 3D assets from text prompts or reference images.',
    meta: 'JSON / MULTIPART',
  },
  {
    id: 'track',
    title: 'Track durable operations',
    description:
      'Generation runs asynchronously. Poll an operation or subscribe to Server-Sent Events for status changes.',
    meta: 'POLL / SSE',
  },
  {
    id: 'retrieve',
    title: 'Retrieve generated output',
    description:
      'Read resource metadata, then download environment content or generated asset files and previews.',
    meta: 'ENVIRONMENT / STL / GLB',
  },
]

export const API_STEPS: ApiStep[] = [
  {
    number: 'STEP 01',
    method: 'POST',
    methodTone: 'post',
    title: 'Submit a generation request',
    description:
      'Send an API key and a unique Idempotency-Key. The API validates access, model availability, and credits.',
  },
  {
    number: 'STEP 02',
    method: 'SSE / POLL',
    methodTone: 'stream',
    title: 'Track the operation',
    description:
      'Use the returned operation ID until its status becomes completed, failed, or cancelled.',
  },
  {
    number: 'STEP 03',
    method: 'GET',
    methodTone: 'get',
    title: 'Download the result',
    description:
      'After completion, use contentUrl for the primary output. Asset operations can also return visualUrl for GLB.',
  },
]

export const API_SECURITY_FEATURES: ApiSecurityFeature[] = [
  {
    id: 'auth',
    title: 'Bearer API authentication',
    description:
      'Create and revoke API keys in SR Platform. Store each secret on your server because it appears only once.',
  },
  {
    id: 'scope',
    title: 'Scoped generation access',
    description:
      'Limit a key to environment generation, asset generation, or both capabilities.',
  },
  {
    id: 'retry',
    title: 'Idempotent create requests',
    description:
      'Retry the same request with its original Idempotency-Key to receive the same operation without another charge.',
  },
  {
    id: 'credits',
    title: 'Shared account credits',
    description:
      'API and website generations use the same credit balance. Model access and cost follow your account tier.',
  },
]

export const API_ENDPOINTS: ApiEndpoint[] = [
  {
    method: 'POST',
    path: '/v1/environments',
    description: 'Queue environment generation from a prompt',
  },
  {
    method: 'POST',
    path: '/v1/assets',
    description: 'Queue asset generation from text or an image',
  },
  {
    method: 'GET',
    path: '/v1/models',
    description: 'List models available to the account tier',
  },
  {
    method: 'GET',
    path: '/v1/operations/{operationId}',
    description: 'Read operation status and its completed result',
  },
  {
    method: 'GET',
    path: '/v1/operations/{operationId}/events',
    description: 'Stream operation updates with Server-Sent Events',
  },
  {
    method: 'GET',
    path: '/v1/assets/{assetId}/visual',
    description: 'Download the optional GLB visual for an asset',
  },
]
