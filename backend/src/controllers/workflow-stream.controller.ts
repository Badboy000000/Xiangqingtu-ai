import { Response, NextFunction } from 'express';
import { Project, Screen } from '../models';
import { AppError } from '../middleware/error-handler';
import type { AuthRequest } from '../middleware/auth.middleware';
import { createSSEResponse, SSEResponse } from '../utils/sse';
import {
  runNode1,
  runNode2,
  runNode3,
  runNode4Prepare,
  runNode4,
} from '../services/workflow.service';

/**
 * 流式工作流控制器
 * 依次执行节点1→节点2→节点3→节点4前置，并通过SSE推送结果
 */
export async function streamWorkflow(
  req: AuthRequest,
  res: Response,
  next: NextFunction
) {
  let sse: SSEResponse | null = null;

  try {
    if (!req.userId) {
      throw new AppError('请先登录', 401);
    }

    const projectId = req.params.id as string;
    
    // 验证项目存在且属于当前用户
    const project = await Project.findOne({
      where: { id: projectId, userId: req.userId },
    });
    
    if (!project) {
      throw new AppError('项目不存在', 404);
    }

    // 创建SSE响应
    sse = createSSEResponse(res);

    // 监听客户端断开连接
    req.on('close', () => {
      console.log(`[SSE] Client disconnected for project ${projectId}`);
      sse?.close();
    });

    // 发送开始消息
    sse.send({
      type: 'workflow_start',
      data: { projectId },
      timestamp: Date.now(),
    });

    // ── 节点1: 信息整理 ──
    sse.sendProgress('node1', 10, '正在分析商品信息...');
    console.log(`[Workflow] Starting Node 1 for project ${projectId}`);
    
    try {
      let node1Result = await runNode1(projectId);
      
      // 防御性处理：LLM 可能返回 {infoAnalysisResult: {...}} 包装格式
      // 需要解包为 {basicInfo: {...}, productCore: {...}} 标准格式
      if (node1Result && (node1Result as any).infoAnalysisResult) {
        console.warn('[Workflow] Node 1 result is wrapped in infoAnalysisResult, unwrapping');
        node1Result = (node1Result as any).infoAnalysisResult;
      }
      
      console.log(`[Workflow] Node 1 result keys:`, Object.keys(node1Result));
      console.log(`[Workflow] Node 1 has basicInfo:`, !!(node1Result as any).basicInfo);
      console.log(`[Workflow] Node 1 has productCore:`, !!(node1Result as any).productCore);
      
      sse.send({
        type: 'node1_complete',
        data: node1Result,
        timestamp: Date.now(),
      });
      
      sse.sendProgress('node1', 25, '商品信息分析完成');
      console.log(`[Workflow] Node 1 completed for project ${projectId}`);
    } catch (err: any) {
      console.error(`[Workflow] Node 1 failed for project ${projectId}:`, err);
      sse.sendError(err.message || '节点1执行失败');
      throw err;
    }

    // ── 节点2: 设计规划 ──
    sse.sendProgress('node2', 30, '正在生成设计规划...');
    console.log(`[Workflow] Starting Node 2 for project ${projectId}`);
    
    try {
      const node2Result = await runNode2(projectId);
      
      console.log(`[Workflow] Node 2 raw result keys:`, Object.keys(node2Result));
      console.log(`[Workflow] Node 2 modules count:`, node2Result.modules?.length);
      console.log(`[Workflow] Node 2 overallStyle:`, node2Result.overallStyle?.substring(0, 80));
      
      // 从 modules 中组合生成设计规划文本
      let planText: string;
      if (node2Result.modules && Array.isArray(node2Result.modules) && node2Result.modules.length > 0) {
        planText = node2Result.modules
          .map((m: any) => `## ${m.theme}\n\n**核心视觉**: ${m.coreVisual}\n**背景风格**: ${m.bgStyle}\n**视觉策略**: ${m.visualStrategy}`)
          .join('\n\n---\n\n');
      } else if (node2Result.overallStyle) {
        console.warn('[Workflow] Node 2 has no modules, using overallStyle fallback');
        planText = node2Result.overallStyle;
      } else {
        // 最终 fallback：输出可读的描述
        console.warn('[Workflow] Node 2 result has no modules or overallStyle, using generic fallback');
        planText = '设计规划已生成，但格式化输出暂不可用。请查看原始数据。';
      }
      
      console.log(`[Workflow] Node 2 planText length: ${planText.length}, first 100 chars: ${planText.substring(0, 100)}`);
      
      // 流式发送设计规划（模拟逐字效果）
      const chunks = splitTextIntoChunks(planText, 50);
      for (let i = 0; i < chunks.length; i++) {
        if (sse.closed) break;
        
        sse.send({
          type: 'node2_stream',
          data: {
            chunk: chunks[i],
            progress: Math.floor(((i + 1) / chunks.length) * 100),
          },
          timestamp: Date.now(),
        });
        
        // 小延迟模拟流式效果
        await sleep(20);
      }
      
      sse.send({
        type: 'node2_complete',
        data: node2Result,
        timestamp: Date.now(),
      });
      
      sse.sendProgress('node2', 50, '设计规划生成完成');
      console.log(`[Workflow] Node 2 completed for project ${projectId}`);
    } catch (err: any) {
      console.error(`[Workflow] Node 2 failed for project ${projectId}:`, err);
      sse.sendError(err.message || '节点2执行失败');
      throw err;
    }

    // ── 节点3: 分屏 Prompt 生成 ──
    sse.sendProgress('node3', 55, '正在生成分屏提示词...');
    console.log(`[Workflow] Starting Node 3 for project ${projectId}`);
    
    try {
      const node3Result = await runNode3(projectId);
      
      // 逐屏发送提示词
      const screens = node3Result.screenPrompts || [];
      for (let i = 0; i < screens.length; i++) {
        if (sse.closed) break;
        
        sse.send({
          type: 'node3_screen',
          data: {
            screenIndex: i,
            screen: screens[i],
            total: screens.length,
          },
          timestamp: Date.now(),
        });
        
        sse.sendProgress('node3', 55 + Math.floor(((i + 1) / screens.length) * 20), 
          `已生成第 ${i + 1}/${screens.length} 屏提示词`);
        
        // 小延迟
        await sleep(100);
      }
      
      sse.send({
        type: 'node3_complete',
        data: node3Result,
        timestamp: Date.now(),
      });
      
      sse.sendProgress('node3', 75, '分屏提示词生成完成');
      console.log(`[Workflow] Node 3 completed for project ${projectId}`);
    } catch (err: any) {
      console.error(`[Workflow] Node 3 failed for project ${projectId}:`, err);
      sse.sendError(err.message || '节点3执行失败');
      throw err;
    }

    // ── 节点4前置: 联合生图指令 ──
    sse.sendProgress('node4', 80, '正在准备生图指令...');
    console.log(`[Workflow] Starting Node 4 Prepare for project ${projectId}`);
    
    try {
      const node4Result = await runNode4Prepare(projectId);
      
      sse.send({
        type: 'node4_prepare',
        data: node4Result,
        timestamp: Date.now(),
      });
      
      sse.sendProgress('node4', 82, '生图指令准备完成');
      console.log(`[Workflow] Node 4 Prepare completed for project ${projectId}`);
    } catch (err: any) {
      console.error(`[Workflow] Node 4 Prepare failed for project ${projectId}:`, err);
      sse.sendError(err.message || '节点4前置执行失败');
      throw err;
    }

    // ── 节点4: 逐屏生图 ──
    sse.sendProgress('node4', 85, '正在生成图片...');
    console.log(`[Workflow] Starting Node 4 image generation for project ${projectId}`);

    // 获取所有屏信息
    const allScreens = await Screen.findAll({
      where: { projectId },
      order: [['screenIndex', 'ASC']],
    });

    for (let i = 0; i < allScreens.length; i++) {
      if (sse.closed) break;

      sse.sendProgress('node4', 85 + Math.floor(((i) / allScreens.length) * 14),
        `正在生成第 ${i + 1}/${allScreens.length} 屏图片...`);
      console.log(`[Workflow] Generating image for screen ${i} of project ${projectId}`);

      try {
        const result = await runNode4(projectId, allScreens[i].screenIndex);

        sse.send({
          type: 'node4_screen',
          data: {
            screenIndex: allScreens[i].screenIndex,
            imageUrl: result.imageUrl,
            total: allScreens.length,
          },
          timestamp: Date.now(),
        });

        console.log(`[Workflow] Screen ${i} image generated for project ${projectId}`);
      } catch (err: any) {
        console.error(`[Workflow] Screen ${i} image generation failed for project ${projectId}:`, err);
        sse.send({
          type: 'node4_screen_error',
          data: {
            screenIndex: allScreens[i].screenIndex,
            error: err.message || `第${i + 1}屏生图失败`,
          },
          timestamp: Date.now(),
        });
      }
    }

    sse.sendProgress('node4', 100, '工作流执行完成');
    console.log(`[Workflow] Node 4 image generation completed for project ${projectId}`);

    // 发送完成消息
    sse.send({
      type: 'workflow_complete',
      data: { projectId },
      timestamp: Date.now(),
    });

    // 关闭SSE连接
    sse.close();
    
  } catch (err) {
    console.error('[Workflow] Stream workflow error:', err);
    
    if (sse) {
      sse.sendError(err instanceof Error ? err : new Error('工作流执行失败'));
      sse.close();
    } else {
      next(err);
    }
  }
}

/**
 * 将文本分割成小块，用于流式显示
 * @param text 原始文本
 * @param chunkSize 每块大小（字符数）
 * @returns 文本块数组
 */
function splitTextIntoChunks(text: string, chunkSize: number): string[] {
  const chunks: string[] = [];
  for (let i = 0; i < text.length; i += chunkSize) {
    chunks.push(text.substring(i, i + chunkSize));
  }
  return chunks;
}

/**
 * 睡眠指定毫秒数
 * @param ms 毫秒数
 */
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}
