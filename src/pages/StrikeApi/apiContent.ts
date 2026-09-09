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

export const HERO_QUICKSTART = [
  '# 1. Initialize environment generation',
  'curl -X POST https://api.strikerobot.ai/v1/environments \\',
  '  -H "Authorization: Bearer $SR_API_KEY" \\',
  '  -H "Content-Type: application/json" \\',
  "  -d '{",
  '    "scene_type": "industrial_warehouse",',
  '    "physics_rigor": "deterministic",',
  '    "sensors": ["lidar_3d", "depth_stereo"]',
  "  }'",
  '',
  '# Response: 202 Accepted',
  '{ "operation_id": "op_89f029bc", "status": "QUEUED" }',
].join('\n')

export const API_LANGUAGES: ApiLanguage[] = ['curl', 'python', 'node']

export const API_CODE_SAMPLES: Record<ApiLanguage, ApiCodeSample> = {
  curl: {
    id: 'curl',
    label: 'cURL',
    code: [
      '# Poll operation progress via GET until status == COMPLETED',
      'curl -X GET \\',
      '  https://api.strikerobot.ai/v1/operations/op_89f029bc \\',
      '  -H "Authorization: Bearer $SR_API_KEY"',
      '',
      '# Response: 200 OK',
      '{',
      '  "operation_id": "op_89f029bc",',
      '  "status": "COMPLETED",',
      '  "progress": 1.0,',
      '  "artifacts": {',
      '    "usd_url": "https://cdn.strikerobot.ai/artifacts/scene_9821.usda",',
      '    "gltf_url": "https://cdn.strikerobot.ai/artifacts/scene_9821.gltf",',
      '    "collision_mesh": "https://cdn.strikerobot.ai/artifacts/collision_9821.obj"',
      '  }',
      '}',
    ].join('\n'),
  },
  python: {
    id: 'python',
    label: 'Python',
    code: [
      'from strikerobot import StrikeClient',
      '',
      'client = StrikeClient(api_key="sr_live_secret")',
      '',
      '# Submit asynchronous generation task',
      'op = client.environments.create(',
      '    scene_type="industrial_warehouse",',
      '    sensors=["lidar_3d", "depth_stereo"]',
      ')',
      '',
      '# Block until completion (or use streaming client.events)',
      'result = op.wait_for_completion(timeout_sec=120)',
      'print(f"Artifacts ready: {result.artifacts.usd_url}")',
    ].join('\n'),
  },
  node: {
    id: 'node',
    label: 'Node.js',
    code: [
      "import { StrikeClient } from '@strikerobot/sdk';",
      '',
      'const strike = new StrikeClient({ apiKey: process.env.SR_API_KEY });',
      '',
      'const operation = await strike.environments.create({',
      "  sceneType: 'industrial_warehouse',",
      "  sensors: ['lidar_3d', 'depth_stereo'],",
      '});',
      '',
      'const completed = await operation.pollUntilComplete();',
      'console.log(completed.artifacts.usdUrl);',
    ].join('\n'),
  },
}

export const API_CAPABILITIES: ApiCapability[] = [
  {
    id: 'generate',
    title: 'Generate',
    description:
      'Create simulation environments and assets directly from your application using multimodal prompts or strict parametric constraints.',
    meta: 'REST / PYTHON SDK',
  },
  {
    id: 'track',
    title: 'Track',
    description:
      'Run long-generation tasks asynchronously and follow their status through polling or server-sent events with granular stage telemetry.',
    meta: 'SSE / WEBHOOKS',
  },
  {
    id: 'retrieve',
    title: 'Retrieve',
    description:
      'Download completed environments, assets, metadata, and available previews across universal robotics interchange formats.',
    meta: 'USD / GLTF / MESH',
  },
]

export const API_STEPS: ApiStep[] = [
  {
    number: 'STEP 01',
    method: 'POST',
    methodTone: 'post',
    title: 'Submit Request',
    description:
      'POST payload with environment parameters, prompt, asset config, and physics constraints.',
  },
  {
    number: 'STEP 02',
    method: 'SSE / POLL',
    methodTone: 'stream',
    title: 'Track Operation',
    description:
      'Stream SSE status or poll operationId until status resolves to COMPLETED.',
  },
  {
    number: 'STEP 03',
    method: 'GET',
    methodTone: 'get',
    title: 'Retrieve Output',
    description:
      'Fetch glTF/USD assets, collision meshes, sensory metadata, and high-resolution spatial manifests.',
  },
]

export const API_SECURITY_FEATURES: ApiSecurityFeature[] = [
  {
    id: 'auth',
    title: 'Bearer API authentication',
    description:
      'Standard Authorization header with instant key revocation and cryptographic rotating secrets.',
  },
  {
    id: 'scope',
    title: 'Scoped API keys',
    description:
      'Granular read, generate, and admin permissions partitioned strictly per project or microservice.',
  },
  {
    id: 'retry',
    title: 'Idempotent requests',
    description:
      'Safe network retries utilizing client-supplied Idempotency-Key headers.',
  },
  {
    id: 'credits',
    title: 'Shared account credits',
    description:
      'Unified billing and compute credit pool synchronized across web studio and API usage.',
  },
]

export const API_ENDPOINTS: ApiEndpoint[] = [
  {
    method: 'POST',
    path: '/v1/environments',
    description: 'Generate procedural robotics environments',
  },
  {
    method: 'POST',
    path: '/v1/assets',
    description: 'Generate specialized 3D simulation assets',
  },
  {
    method: 'GET',
    path: '/v1/operations/{operationId}',
    description: 'Inspect async job status and telemetry',
  },
  {
    method: 'GET',
    path: '/v1/models',
    description: 'List supported foundation simulation models',
  },
]
