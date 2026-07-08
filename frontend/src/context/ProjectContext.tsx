import { createContext, useContext, useReducer, useCallback, useRef, useEffect, type ReactNode } from 'react';
import * as api from '../api';
import type { SSEMessage } from '../types/sse';

// ── 类型定义 ──────────────────────────────────────────────

export interface ScreenData {
  id?: string;
  screenIndex: number;
  label: string;
  theme: string;
  prompt: string;
  imageUrl: string;
  status: string;
}

export interface ProjectData {
  id: string;
  name: string;
  platform: string;
  status: string;
  productInfo: Record<string, any>;
  node1Output: any;
  node2Output: any;
  node3Output: any;
  screens: ScreenData[];
}

interface State {
  projectId: string | null;
  project: ProjectData | null;
  screens: ScreenData[];
  node1Loading: boolean;
  node2Loading: boolean;
  node3Loading: boolean;
  node4Loading: number[];   // 正在生成的 screenIndex 列表
  exportLoading: boolean;
  exportResult: any;
  error: string | null;
  planText: string;
  node2Output: any;         // ← 新增：节点2完整输出数据
  workflowStep: 'idle' | 'creating' | 'node1' | 'node2' | 'node3' | 'node4' | 'complete';
  sseConnected: boolean;
  workflowProgress: number; // 0-100
  projectLoading: boolean;  // ← 新增：项目数据加载中标志
  workflowHasRun: boolean;  // ← 新增：工作流是否已执行过
}

type Action =
  | { type: 'SET_PROJECT'; payload: { projectId: string; project: ProjectData } }
  | { type: 'SET_SCREENS'; payload: ScreenData[] }
  | { type: 'SET_NODE1_LOADING'; payload: boolean }
  | { type: 'SET_NODE2_LOADING'; payload: boolean }
  | { type: 'SET_NODE3_LOADING'; payload: boolean }
  | { type: 'ADD_NODE4_LOADING'; payload: number }
  | { type: 'REMOVE_NODE4_LOADING'; payload: number }
  | { type: 'SET_EXPORT_LOADING'; payload: boolean }
  | { type: 'SET_EXPORT_RESULT'; payload: any }
  | { type: 'SET_ERROR'; payload: string | null }
  | { type: 'SET_PLAN_TEXT'; payload: string }
  | { type: 'APPEND_PLAN_TEXT'; payload: string }
  | { type: 'UPDATE_SCREEN'; payload: { index: number; data: Partial<ScreenData> } }
  | { type: 'ADD_SCREEN'; payload: ScreenData }
  | { type: 'SET_WORKFLOW_STEP'; payload: State['workflowStep'] }
  | { type: 'SET_SSE_CONNECTED'; payload: boolean }
  | { type: 'SET_WORKFLOW_PROGRESS'; payload: number }
  | { type: 'SET_PROJECT_LOADING'; payload: boolean }      // ← 新增
  | { type: 'SET_WORKFLOW_HAS_RUN'; payload: boolean }     // ← 新增
  | { type: 'SET_NODE2_OUTPUT'; payload: any }             // ← 新增：保存节点2完整输出
  | { type: 'RESET' };

const initialState: State = {
  projectId: null,
  project: null,
  screens: [],
  node1Loading: false,
  node2Loading: false,
  node3Loading: false,
  node4Loading: [],
  exportLoading: false,
  exportResult: null,
  error: null,
  planText: '',
  node2Output: null,        // ← 新增
  workflowStep: 'idle',
  sseConnected: false,
  workflowProgress: 0,
  projectLoading: false,    // ← 新增
  workflowHasRun: false,    // ← 新增
};

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case 'SET_PROJECT':
      // 持久化 projectId 到 localStorage
      if (action.payload.projectId) {
        localStorage.setItem('currentProjectId', action.payload.projectId);
      }
      return { ...state, projectId: action.payload.projectId, project: action.payload.project };
    case 'SET_SCREENS':
      return { ...state, screens: action.payload };
    case 'SET_NODE1_LOADING':
      return { ...state, node1Loading: action.payload, error: null };
    case 'SET_NODE2_LOADING':
      return { ...state, node2Loading: action.payload, error: null };
    case 'SET_NODE3_LOADING':
      return { ...state, node3Loading: action.payload, error: null };
    case 'ADD_NODE4_LOADING':
      return { ...state, node4Loading: [...state.node4Loading, action.payload] };
    case 'REMOVE_NODE4_LOADING':
      return { ...state, node4Loading: state.node4Loading.filter(i => i !== action.payload) };
    case 'SET_EXPORT_LOADING':
      return { ...state, exportLoading: action.payload, error: null };
    case 'SET_EXPORT_RESULT':
      return { ...state, exportResult: action.payload };
    case 'SET_ERROR':
      return { 
        ...state, 
        error: action.payload,
        node1Loading: false,
        node2Loading: false,
        node3Loading: false,
        node4Loading: [],
        exportLoading: false,
      };
    case 'SET_PLAN_TEXT':
      return { ...state, planText: action.payload };
    case 'APPEND_PLAN_TEXT':
      return { ...state, planText: state.planText + action.payload };
    case 'UPDATE_SCREEN':
      return {
        ...state,
        screens: state.screens.map((s, i) => i === action.payload.index ? { ...s, ...action.payload.data } : s),
      };
    case 'ADD_SCREEN':
      return { ...state, screens: [...state.screens, action.payload] };
    case 'SET_WORKFLOW_STEP':
      return { ...state, workflowStep: action.payload };
    case 'SET_SSE_CONNECTED':
      return { ...state, sseConnected: action.payload };
    case 'SET_WORKFLOW_PROGRESS':
      return { ...state, workflowProgress: action.payload };
    case 'SET_PROJECT_LOADING':
      return { ...state, projectLoading: action.payload };
    case 'SET_WORKFLOW_HAS_RUN':
      return { ...state, workflowHasRun: action.payload };
    case 'SET_NODE2_OUTPUT':  // ← 保存节点2完整输出
      return { 
        ...state, 
        node2Output: action.payload,
        planText: action.payload?.fullReport || state.planText,  // 使用 fullReport
        project: state.project ? { ...state.project, node2Output: action.payload } : null,  // 同步更新 project.node2Output
      };
    case 'RESET':
      return initialState;
    default:
      return state;
  }
}

// ── Context ───────────────────────────────────────────────

interface ContextValue {
  state: State;
  dispatch: React.Dispatch<Action>;
  // 便捷 action
  createAndAnalyze: (params: api.CreateProjectParams) => Promise<void>;
  startWorkflowStream: (params: api.CreateProjectParams) => Promise<void>;
  startWorkflow: (projectId: string) => Promise<void>;  // 新增：仅启动工作流
  runPlan: () => Promise<void>;
  runPrompts: () => Promise<void>;
  runGenerateScreen: (index: number) => Promise<void>;
  runApproveScreen: (index: number) => Promise<void>;
  runReviseScreen: (index: number, feedback: string, prompt?: string) => Promise<void>;
  runEditScreen: (index: number, editPrompt: string) => Promise<void>;
  runExport: (format: string, quality: string, width: number) => Promise<void>;
  loadProject: (id: string) => Promise<void>;
}

const ProjectContext = createContext<ContextValue | null>(null);

export function ProjectProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, initialState);

  // 使用 ref 跟踪最新的 project，避免 SSE 长连接中闭包过期问题
  const projectRef = useRef<ProjectData | null>(null);
  useEffect(() => { projectRef.current = state.project; }, [state.project]);

  const createAndAnalyze = useCallback(async (params: api.CreateProjectParams) => {
    dispatch({ type: 'SET_NODE1_LOADING', payload: true });
    try {
      const project = await api.createProject(params);
      const id = project.id;
      dispatch({ type: 'SET_PROJECT', payload: { projectId: id, project } });
      // 自动调用节点1
      const node1Result = await api.analyzeProject(id);
      dispatch({ type: 'SET_PROJECT', payload: { projectId: id, project: { ...project, node1Output: node1Result } } });
    } catch (err: any) {
      dispatch({ type: 'SET_ERROR', payload: err.message || '创建项目失败' });
      throw err;
    } finally {
      dispatch({ type: 'SET_NODE1_LOADING', payload: false });
    }
  }, []);

  const startWorkflowStream = useCallback(async (params: api.CreateProjectParams): Promise<void> => {
    try {
      // 步骤1: 创建项目
      dispatch({ type: 'SET_WORKFLOW_STEP', payload: 'creating' });
      dispatch({ type: 'SET_WORKFLOW_PROGRESS', payload: 5 });
      dispatch({ type: 'SET_WORKFLOW_HAS_RUN', payload: true });  // ← 标记工作流开始执行
      
      const project = await api.createProject(params);
      const id = project.id;
      
      dispatch({ type: 'SET_PROJECT', payload: { projectId: id, project } });
      dispatch({ type: 'SET_WORKFLOW_STEP', payload: 'node1' });
      dispatch({ type: 'SET_WORKFLOW_PROGRESS', payload: 10 });
      
      // 步骤2: 建立SSE连接
      const token = localStorage.getItem('token');
      
      // 使用 fetch + ReadableStream 替代 EventSource（因为 EventSource 不支持自定义 headers）
      const url = `/api/projects/${id}/workflow/stream`;
      
      // 由于EventSource不支持自定义headers，我们使用fetch API替代
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Accept': 'text/event-stream',
        },
      });
      
      if (!response.ok) {
        throw new Error(`SSE连接失败: ${response.status}`);
      }
      
      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error('无法获取响应流');
      }
      
      dispatch({ type: 'SET_SSE_CONNECTED', payload: true });
      
      // 读取流数据
      const decoder = new TextDecoder();
      let buffer = '';
      
      while (true) {
        const { done, value } = await reader.read();
        
        if (done) {
          console.log('[SSE] Stream completed');
          dispatch({ type: 'SET_WORKFLOW_STEP', payload: 'complete' });
          dispatch({ type: 'SET_WORKFLOW_PROGRESS', payload: 100 });
          dispatch({ type: 'SET_SSE_CONNECTED', payload: false });
          break;
        }
        
        buffer += decoder.decode(value, { stream: true });
        
        // 解析SSE消息（以\n\n分隔）
        const messages = buffer.split('\n\n');
        buffer = messages.pop() || ''; // 保留最后一个不完整的消息
        
        for (const message of messages) {
          if (!message.trim()) continue; // 跳过空消息
          if (message.trim().startsWith(':')) continue; // 跳过心跳/注释
          
          try {
            // SSE协议：多行数据每行都以 data: 开头，需要全部收集并拼接
            const lines = message.split('\n');
            const dataLines: string[] = [];
            for (const line of lines) {
              if (line.startsWith('data:')) {
                // 去掉 "data: " 或 "data:" 前缀
                dataLines.push(line.slice(line.indexOf(':') + 1).trimStart());
              }
            }
            if (dataLines.length === 0) continue;
            
            // 将所有 data 行拼接回完整 JSON
            const rawJson = dataLines.join('\n');
            const sseMessage: SSEMessage = JSON.parse(rawJson);
            
            console.log('[SSE] Received:', sseMessage.type, 'data keys:', sseMessage.data ? Object.keys(sseMessage.data) : 'null');
            
            // 根据消息类型处理
            switch (sseMessage.type) {
              case 'progress':
                dispatch({ type: 'SET_WORKFLOW_PROGRESS', payload: sseMessage.data.progress });
                // 根据step更新workflowStep
                if (sseMessage.data.step === 'node1') {
                  dispatch({ type: 'SET_WORKFLOW_STEP', payload: 'node1' });
                } else if (sseMessage.data.step === 'node2') {
                  dispatch({ type: 'SET_WORKFLOW_STEP', payload: 'node2' });
                } else if (sseMessage.data.step === 'node3') {
                  dispatch({ type: 'SET_WORKFLOW_STEP', payload: 'node3' });
                } else if (sseMessage.data.step === 'node4') {
                  dispatch({ type: 'SET_WORKFLOW_STEP', payload: 'node4' });
                }
                break;
                
              case 'node1_complete': {
                const node1Data = sseMessage.data;
                console.log('[SSE] node1_complete: visionReports:', node1Data?.visionReports?.length);
                // 从 productInfo 中获取商品名称
                const analyzedName1 = node1Data?.productInfo?.name;
                dispatch({
                  type: 'SET_PROJECT',
                  payload: {
                    projectId: id,
                    project: { ...project, node1Output: node1Data, ...(analyzedName1 ? { name: analyzedName1 } : {}) },
                  },
                });
                break;
              }
                
              case 'node2_stream':
                // 流式追加设计规划文本
                console.log('[SSE] node2_stream chunk length:', sseMessage.data.chunk?.length, 'first 50:', sseMessage.data.chunk?.substring(0, 50));
                dispatch({ type: 'APPEND_PLAN_TEXT', payload: sseMessage.data.chunk });
                break;
                
              case 'node2_complete':
                // 保存完整的 node2Output 数据
                dispatch({ type: 'SET_NODE2_OUTPUT', payload: sseMessage.data });
                dispatch({ type: 'SET_WORKFLOW_STEP', payload: 'node2' });
                break;
                
              case 'node3_screen':
                // 逐屏添加提示词
                const screenData: ScreenData = {
                  screenIndex: sseMessage.data.screenIndex,
                  label: sseMessage.data.screen.label || `第 ${sseMessage.data.screenIndex + 1} 屏`,
                  theme: sseMessage.data.screen.theme || '',
                  prompt: sseMessage.data.screen.prompt || '',
                  imageUrl: '',
                  status: 'prompt_ready',
                };
                dispatch({ type: 'ADD_SCREEN', payload: screenData });
                break;
                
              case 'node3_complete':
                dispatch({ type: 'SET_WORKFLOW_STEP', payload: 'node3' });
                break;
                
              case 'node4_prepare':
                dispatch({ type: 'SET_WORKFLOW_STEP', payload: 'node4' });
                break;
            
              case 'node4_screen':
                // 逐屏更新生成的图片
                dispatch({
                  type: 'UPDATE_SCREEN',
                  payload: {
                    index: sseMessage.data.screenIndex,
                    data: {
                      imageUrl: sseMessage.data.imageUrl || '',
                      status: 'generated',
                    },
                  },
                });
                break;
            
              case 'node4_screen_error':
                // 单屏生图失败，不中断整体流程
                console.warn(`[SSE] Screen ${sseMessage.data.screenIndex} generation failed:`, sseMessage.data.error);
                break;
            
              case 'workflow_complete':
                dispatch({ type: 'SET_WORKFLOW_STEP', payload: 'complete' });
                dispatch({ type: 'SET_WORKFLOW_PROGRESS', payload: 100 });
                break;
            
              case 'error':
                dispatch({ type: 'SET_ERROR', payload: sseMessage.data.message });
                throw new Error(sseMessage.data.message);
            
              default:
                console.warn('[SSE] Unknown message type:', sseMessage.type);
            }
          } catch (err) {
            console.error('[SSE] Failed to parse message:', err);
          }
        }
      }
      
    } catch (err: any) {
      dispatch({ type: 'SET_ERROR', payload: err.message || '工作流执行失败' });
      dispatch({ type: 'SET_SSE_CONNECTED', payload: false });
      throw err;
    }
  }, []);

  // 新增：仅启动工作流（不创建项目）
  const startWorkflow = useCallback(async (projectId: string): Promise<void> => {
    try {
      console.log('[ProjectContext] Starting workflow for project:', projectId);
      dispatch({ type: 'SET_WORKFLOW_STEP', payload: 'node1' });
      dispatch({ type: 'SET_WORKFLOW_PROGRESS', payload: 10 });
      dispatch({ type: 'SET_WORKFLOW_HAS_RUN', payload: true });  // ← 标记工作流开始执行
      
      // 建立SSE连接
      const token = localStorage.getItem('token');
      const url = `/api/projects/${projectId}/workflow/stream`;
      
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Accept': 'text/event-stream',
        },
      });
      
      if (!response.ok) {
        throw new Error(`SSE连接失败: ${response.status}`);
      }
      
      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error('无法获取响应流');
      }
      
      dispatch({ type: 'SET_SSE_CONNECTED', payload: true });
      
      // 读取流数据
      const decoder = new TextDecoder();
      let buffer = '';
      
      while (true) {
        const { done, value } = await reader.read();
        
        if (done) {
          console.log('[SSE] Stream completed');
          dispatch({ type: 'SET_WORKFLOW_STEP', payload: 'complete' });
          dispatch({ type: 'SET_WORKFLOW_PROGRESS', payload: 100 });
          dispatch({ type: 'SET_SSE_CONNECTED', payload: false });
          break;
        }
        
        buffer += decoder.decode(value, { stream: true });
        
        // 解析SSE消息
        const messages = buffer.split('\n\n');
        buffer = messages.pop() || '';
        
        for (const message of messages) {
          if (!message.trim()) continue;
          if (message.trim().startsWith(':')) continue;
          
          try {
            const lines = message.split('\n');
            const dataLines: string[] = [];
            for (const line of lines) {
              if (line.startsWith('data:')) {
                dataLines.push(line.slice(line.indexOf(':') + 1).trimStart());
              }
            }
            if (dataLines.length === 0) continue;
            
            const rawJson = dataLines.join('\n');
            const sseMessage: SSEMessage = JSON.parse(rawJson);
            
            console.log('[SSE] Received:', sseMessage.type);
            
            switch (sseMessage.type) {
              case 'progress':
                dispatch({ type: 'SET_WORKFLOW_PROGRESS', payload: sseMessage.data.progress });
                if (sseMessage.data.step === 'node1') dispatch({ type: 'SET_WORKFLOW_STEP', payload: 'node1' });
                else if (sseMessage.data.step === 'node2') dispatch({ type: 'SET_WORKFLOW_STEP', payload: 'node2' });
                else if (sseMessage.data.step === 'node3') dispatch({ type: 'SET_WORKFLOW_STEP', payload: 'node3' });
                else if (sseMessage.data.step === 'node4') dispatch({ type: 'SET_WORKFLOW_STEP', payload: 'node4' });
                break;
                
              case 'node1_complete': {
                const node1Data = sseMessage.data;
                console.log('[SSE] node1_complete: visionReports:', node1Data?.visionReports?.length);
                // 从 productInfo 中获取商品名称
                const analyzedName2 = node1Data?.productInfo?.name;
                // 更新当前项目的 node1Output（使用 ref 获取最新 project，避免闭包过期）
                const currentProject = projectRef.current;
                dispatch({
                  type: 'SET_PROJECT',
                  payload: {
                    projectId,
                    project: { ...(currentProject || { id: projectId, name: '', platform: '', status: '', productInfo: {}, node1Output: null, node2Output: null, node3Output: null, screens: [] }), node1Output: node1Data, ...(analyzedName2 ? { name: analyzedName2 } : {}) },
                  },
                });
                break;
              }
                
              case 'node2_stream':
                dispatch({ type: 'APPEND_PLAN_TEXT', payload: sseMessage.data.chunk });
                break;
                
              case 'node2_complete':
                // 保存完整的 node2Output 数据
                dispatch({ type: 'SET_NODE2_OUTPUT', payload: sseMessage.data });
                dispatch({ type: 'SET_WORKFLOW_STEP', payload: 'node2' });
                break;
                
              case 'node3_screen':
                const screenData: ScreenData = {
                  screenIndex: sseMessage.data.screenIndex,
                  label: sseMessage.data.screen.label || `第 ${sseMessage.data.screenIndex + 1} 屏`,
                  theme: sseMessage.data.screen.theme || '',
                  prompt: sseMessage.data.screen.prompt || '',
                  imageUrl: '',
                  status: 'prompt_ready',
                };
                dispatch({ type: 'ADD_SCREEN', payload: screenData });
                break;
                
              case 'node3_complete':
                dispatch({ type: 'SET_WORKFLOW_STEP', payload: 'node3' });
                break;
                
              case 'node4_prepare':
                dispatch({ type: 'SET_WORKFLOW_STEP', payload: 'node4' });
                break;
            
              case 'node4_screen':
                // 逐屏更新生成的图片
                dispatch({
                  type: 'UPDATE_SCREEN',
                  payload: {
                    index: sseMessage.data.screenIndex,
                    data: {
                      imageUrl: sseMessage.data.imageUrl || '',
                      status: 'generated',
                    },
                  },
                });
                break;
            
              case 'node4_screen_error':
                console.warn(`[SSE] Screen ${sseMessage.data.screenIndex} generation failed:`, sseMessage.data.error);
                break;
            
              case 'workflow_complete':
                dispatch({ type: 'SET_WORKFLOW_STEP', payload: 'complete' });
                dispatch({ type: 'SET_WORKFLOW_PROGRESS', payload: 100 });
                break;
            
              case 'error':
                dispatch({ type: 'SET_ERROR', payload: sseMessage.data.message });
                throw new Error(sseMessage.data.message);
            }
          } catch (err) {
            console.error('[SSE] Failed to parse message:', err);
          }
        }
      }
      
    } catch (err: any) {
      dispatch({ type: 'SET_ERROR', payload: err.message || '工作流执行失败' });
      dispatch({ type: 'SET_SSE_CONNECTED', payload: false });
      throw err;
    }
  }, []);
  
  const runPlan = useCallback(async () => {
    if (!state.projectId) return;
    dispatch({ type: 'SET_NODE2_LOADING', payload: true });
    try {
      const result = await api.planProject(state.projectId);
      // result 是 node2Output（设计规划文本）
      const planText = typeof result === 'string' ? result : (result.designPlan || result.plan || JSON.stringify(result));
      dispatch({ type: 'SET_PLAN_TEXT', payload: planText });
    } catch (err: any) {
      dispatch({ type: 'SET_ERROR', payload: err.message || '生成规划失败' });
      throw err;
    } finally {
      dispatch({ type: 'SET_NODE2_LOADING', payload: false });
    }
  }, [state.projectId]);

  const runPrompts = useCallback(async () => {
    if (!state.projectId) return;
    dispatch({ type: 'SET_NODE3_LOADING', payload: true });
    try {
      const result = await api.generatePrompts(state.projectId);
      // result 应包含 screens 数组
      const screens: ScreenData[] = (result.screens || result.screenPrompts || []).map((s: any, i: number) => ({
        screenIndex: i,
        label: s.label || s.title || `第 ${i + 1} 屏`,
        theme: s.theme || '',
        prompt: s.prompt || '',
        imageUrl: '',
        status: 'prompt_ready',
      }));
      dispatch({ type: 'SET_SCREENS', payload: screens });
    } catch (err: any) {
      dispatch({ type: 'SET_ERROR', payload: err.message || '生成提示词失败' });
      throw err;
    } finally {
      dispatch({ type: 'SET_NODE3_LOADING', payload: false });
    }
  }, [state.projectId]);

  const runGenerateScreen = useCallback(async (index: number) => {
    if (!state.projectId) return;
    dispatch({ type: 'ADD_NODE4_LOADING', payload: index });
    try {
      const result = await api.generateScreen(state.projectId, index);
      dispatch({
        type: 'UPDATE_SCREEN',
        payload: {
          index,
          data: {
            imageUrl: result.imageUrl || result.url || '',
            status: 'generated',
          },
        },
      });
    } catch (err: any) {
      dispatch({ type: 'SET_ERROR', payload: err.message || `第${index + 1}屏生成失败` });
    } finally {
      dispatch({ type: 'REMOVE_NODE4_LOADING', payload: index });
    }
  }, [state.projectId]);

  const runApproveScreen = useCallback(async (index: number) => {
    if (!state.projectId) return;
    try {
      await api.approveScreen(state.projectId, index);
      dispatch({ type: 'UPDATE_SCREEN', payload: { index, data: { status: 'approved' } } });
    } catch (err: any) {
      dispatch({ type: 'SET_ERROR', payload: err.message || '确认失败' });
    }
  }, [state.projectId]);

  const runReviseScreen = useCallback(async (index: number, feedback: string, prompt?: string) => {
    if (!state.projectId) return;
    try {
      await api.reviseScreen(state.projectId, index, feedback, prompt);
      dispatch({ type: 'UPDATE_SCREEN', payload: { index, data: { status: 'needs_revision' } } });
    } catch (err: any) {
      dispatch({ type: 'SET_ERROR', payload: err.message || '标记修改失败' });
    }
  }, [state.projectId]);

  const runEditScreen = useCallback(async (index: number, editPrompt: string) => {
    if (!state.projectId) return;
    dispatch({ type: 'ADD_NODE4_LOADING', payload: index });
    try {
      const result = await api.editScreen(state.projectId, index, editPrompt);
      dispatch({
        type: 'UPDATE_SCREEN',
        payload: {
          index,
          data: {
            imageUrl: result.imageUrl || '',
            status: 'generated',
          },
        },
      });
    } catch (err: any) {
      dispatch({ type: 'SET_ERROR', payload: err.message || `第${index + 1}屏编辑失败` });
      throw err;
    } finally {
      dispatch({ type: 'REMOVE_NODE4_LOADING', payload: index });
    }
  }, [state.projectId]);

  const runExport = useCallback(async (format: string, quality: string, width: number) => {
    if (!state.projectId) return;
    dispatch({ type: 'SET_EXPORT_LOADING', payload: true });
    try {
      const result = await api.exportProject(state.projectId, format, quality, width);
      dispatch({ type: 'SET_EXPORT_RESULT', payload: result });
    } catch (err: any) {
      dispatch({ type: 'SET_ERROR', payload: err.message || '导出失败' });
      throw err;
    } finally {
      dispatch({ type: 'SET_EXPORT_LOADING', payload: false });
    }
  }, [state.projectId]);

  const loadProject = useCallback(async (id: string) => {
    // ← Layer 1: 标记开始加载，防止 ProductInfoPanel 误触发
    dispatch({ type: 'SET_PROJECT_LOADING', payload: true });
    
    try {
      const project = await api.getProject(id);
      
      // 先加载 screens，确保 ProductInfoPanel 能正确判断 hasGeneratedScreens
      if (project.screens) {
        dispatch({
          type: 'SET_SCREENS',
          payload: project.screens.map((s: any) => ({
            screenIndex: s.screenIndex,
            label: s.label || '',
            theme: s.theme || '',
            prompt: s.prompt || '',
            imageUrl: s.imageUrl || '',
            status: s.status || 'waiting',
          })),
        });
      }
      
      // 将后端字段映射到前端状态结构
      const mappedProject = {
        ...project,
        // 始终加载已存在的节点输出数据，确保页面刷新后能正确恢复
        node1Output: project.infoAnalysisResult || null,
        node2Output: project.designPlanResult || null,
        node3Output: project.promptGenMotherPrompt || null,
      };
      dispatch({ type: 'SET_PROJECT', payload: { projectId: id, project: mappedProject } });
      
      // 恢复设计规划文本
      if (project.designPlanResult?.fullReport) {
        dispatch({ type: 'SET_PLAN_TEXT', payload: project.designPlanResult.fullReport });
      }
      
      // ← Layer 3: 根据数据完整性精细判断当前应该处于哪个步骤
      const hasNode1Data = !!project.infoAnalysisResult;
      const hasNode2Data = !!project.designPlanResult;
      const hasNode3Data = !!project.promptGenMotherPrompt;
      const hasScreensWithImages = project.screens && project.screens.some((s: any) => s.imageUrl);
      
      if (hasScreensWithImages) {
        // 完全完成
        dispatch({ type: 'SET_WORKFLOW_STEP', payload: 'complete' });
        dispatch({ type: 'SET_WORKFLOW_PROGRESS', payload: 100 });
        dispatch({ type: 'SET_WORKFLOW_HAS_RUN', payload: true });
      } else if (hasNode3Data || (project.screens && project.screens.length > 0)) {
        // 至少到了 node3，可能用户手动触发了部分流程
        dispatch({ type: 'SET_WORKFLOW_STEP', payload: 'node3' });
        dispatch({ type: 'SET_WORKFLOW_PROGRESS', payload: 70 });
        dispatch({ type: 'SET_WORKFLOW_HAS_RUN', payload: true });
      } else if (hasNode2Data) {
        dispatch({ type: 'SET_WORKFLOW_STEP', payload: 'node2' });
        dispatch({ type: 'SET_WORKFLOW_PROGRESS', payload: 40 });
        dispatch({ type: 'SET_WORKFLOW_HAS_RUN', payload: true });
      } else if (hasNode1Data) {
        dispatch({ type: 'SET_WORKFLOW_STEP', payload: 'node1' });
        dispatch({ type: 'SET_WORKFLOW_PROGRESS', payload: 15 });
        dispatch({ type: 'SET_WORKFLOW_HAS_RUN', payload: true });
      } else {
        // 真正的全新项目，等待 ProductInfoPanel 触发
        dispatch({ type: 'SET_WORKFLOW_STEP', payload: 'idle' });
        dispatch({ type: 'SET_WORKFLOW_PROGRESS', payload: 0 });
        dispatch({ type: 'SET_WORKFLOW_HAS_RUN', payload: false });
      }
    } catch (err: any) {
      dispatch({ type: 'SET_ERROR', payload: err.message || '加载项目失败' });
    } finally {
      // ← Layer 1: 加载完成，解除锁定
      dispatch({ type: 'SET_PROJECT_LOADING', payload: false });
    }
  }, []);

  return (
    <ProjectContext.Provider value={{
      state, dispatch,
      createAndAnalyze, startWorkflowStream, startWorkflow, runPlan, runPrompts,
      runGenerateScreen, runApproveScreen, runReviseScreen, runEditScreen,
      runExport, loadProject,
    }}>
      {children}
    </ProjectContext.Provider>
  );
}

export function useProject() {
  const ctx = useContext(ProjectContext);
  if (!ctx) throw new Error('useProject must be used within ProjectProvider');
  return ctx;
}
