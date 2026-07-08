// ─── API 客户端 ─── 封装与后端的所有 HTTP 通信

const BASE = '/api';

function getToken(): string | null {
  return localStorage.getItem('token');
}

async function request<T = any>(url: string, options?: RequestInit): Promise<T> {
  const token = getToken();
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const res = await fetch(`${BASE}${url}`, {
    headers,
    ...options,
  });

  if (res.status === 401) {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    window.location.href = '/auth';
    throw new Error('登录已过期');
  }

  const json = await res.json();
  if (!res.ok || !json.success) {
    throw new Error(json.error || json.message || `请求失败 (${res.status})`);
  }
  return json.data;
}

// ── 项目管理 ──────────────────────────────────────────────

export interface CreateProjectParams {
  name: string;
  platform: 'domestic' | 'overseas';
  sellingPoints: string;
  targetAudience: string;
  priceRange: string;
  designRequirements: string;
  referenceImages: File[];
  category?: string;
  referenceStyle?: string;
  language?: string;
  screenCount?: number;
  material?: string;       // 材质
  productSpecs?: string;   // 产品规格参数
}

export async function createProject(params: CreateProjectParams) {
  const formData = new FormData();
  formData.append('name', params.name);
  formData.append('platform', params.platform);
  formData.append('sellingPoints', params.sellingPoints);
  formData.append('targetAudience', params.targetAudience);
  formData.append('priceRange', params.priceRange);
  formData.append('designRequirements', params.designRequirements);
  if (params.category) formData.append('category', params.category);
  if (params.referenceStyle) formData.append('referenceStyle', params.referenceStyle);
  if (params.language) formData.append('language', params.language);
  if (params.material) formData.append('material', params.material);
  if (params.productSpecs) formData.append('productSpecs', params.productSpecs);
  formData.append('screenCount', String(params.screenCount || 8));
  params.referenceImages.forEach((file) => {
    formData.append('referenceImages', file);
  });

  const token = getToken();
  const headers: Record<string, string> = {};
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const res = await fetch(`${BASE}/projects`, { method: 'POST', headers, body: formData });
  const json = await res.json();
  if (!res.ok || !json.success) throw new Error(json.error || '创建项目失败');
  return json.data;
}

export async function getProject(id: string) {
  return request(`/projects/${id}`);
}

export async function deleteProject(id: string) {
  return request(`/projects/${id}`, { method: 'DELETE' });
}

export async function listProjects() {
  return request('/projects');
}

// ── 四节点工作流 ──────────────────────────────────────────

export async function analyzeProject(id: string) {
  return request(`/projects/${id}/analyze`, { method: 'POST' });
}

export async function planProject(id: string) {
  return request(`/projects/${id}/plan`, { method: 'POST' });
}

export async function generatePrompts(id: string) {
  return request(`/projects/${id}/prompts`, { method: 'POST' });
}

export async function prepareGenerate(id: string) {
  return request(`/projects/${id}/prepare-generate`, { method: 'POST' });
}

// ── SSE 流式工作流 ────────────────────────────────────────

/**
 * 启动流式工作流（SSE）
 * @param projectId 项目ID
 * @returns EventSource 实例
 */
export function startWorkflowStream(projectId: string): EventSource {
  const token = getToken();
  // EventSource 不支持自定义 headers，所以将 token 放在 URL 参数中
  const url = `${BASE}/projects/${projectId}/workflow/stream${token ? `?token=${encodeURIComponent(token)}` : ''}`;
  return new EventSource(url);
}

export async function generateScreen(id: string, screenIndex: number) {
  return request(`/projects/${id}/screens/${screenIndex}/generate`, { method: 'POST' });
}

// ── 屏级确认 ──────────────────────────────────────────────

export async function approveScreen(id: string, screenIndex: number) {
  return request(`/projects/${id}/screens/${screenIndex}/approve`, { method: 'POST' });
}

export async function reviseScreen(id: string, screenIndex: number, feedback: string, prompt?: string) {
  return request(`/projects/${id}/screens/${screenIndex}/revise`, {
    method: 'POST',
    body: JSON.stringify({ feedback, prompt }),
  });
}

export async function editScreen(id: string, screenIndex: number, editPrompt: string) {
  return request(`/projects/${id}/screens/${screenIndex}/edit`, {
    method: 'POST',
    body: JSON.stringify({ editPrompt }),
  });
}

// ── 导出 ──────────────────────────────────────────────────

export async function exportProject(id: string, format: string, quality: string, width: number) {
  return request(`/projects/${id}/export`, {
    method: 'POST',
    body: JSON.stringify({ format, quality, width }),
  });
}

export async function getLatestExport(id: string) {
  return request(`/projects/${id}/export/latest`);
}

// ── 认证 ────────────────────────────────────────────────

export interface RegisterParams {
  username: string;
  email: string;
  password: string;
  nickname?: string;
  avatar?: string;
}

export interface LoginParams {
  account: string;
  password: string;
}

export interface AuthResult {
  token: string;
  user: {
    id: string;
    username: string;
    email: string;
    nickname: string | null;
    avatar: string | null;
  };
}

export async function register(params: RegisterParams): Promise<AuthResult> {
  const res = await fetch(`${BASE}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
  });
  const json = await res.json();
  if (!res.ok || !json.success) throw new Error(json.error || '注册失败');
  return json.data;
}

export async function login(params: LoginParams): Promise<AuthResult> {
  const res = await fetch(`${BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
  });
  const json = await res.json();
  if (!res.ok || !json.success) throw new Error(json.error || '登录失败');
  return json.data;
}

export async function getMe(): Promise<AuthResult['user']> {
  return request('/auth/me');
}
