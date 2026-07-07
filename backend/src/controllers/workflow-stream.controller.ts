import { Response, NextFunction } from 'express';
import { Project, Screen } from '../models';
import { AppError } from '../middleware/error-handler';
import type { AuthRequest } from '../middleware/auth.middleware';
import { createSSEResponse, SSEResponse } from '../utils/sse';
import {
  runNode1,
  runNode2,
  runNode3,
  runNode4,
} from '../services/workflow.service';

/**
 * 流式工作流控制器
 * 依次执行节点1→节点2→节点3→节点4（逐屏生图），并通过SSE推送结果
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

    // ─ 节点1: 信息整理 ──
    sse.sendProgress('node1', 10, '正在分析商品信息...');
    console.log(`\n========== [WORKFLOW DEBUG] STARTING NODE 1 ==========`);
    console.log(`projectId: ${projectId}`);
    console.log(`====================================================\n`);
    
    try {
      const node1Result = await runNode1(projectId);
      
      console.log(`\n========== [WORKFLOW DEBUG] NODE 1 COMPLETE ==========`);
      console.log(`vision reports: ${node1Result.visionReports.length}`);
      console.log(`======================================================\n`);
      
      sse.send({
        type: 'node1_complete',
        data: node1Result,
        timestamp: Date.now(),
      });
    } catch (err: any) {
      console.error(`[Workflow] Node 1 failed for project ${projectId}:`, err);
      sse.sendError(err.message || '节点1执行失败');
      throw err;
    }

    // ─ 节点2: 设计规划 ──
    sse.sendProgress('node2', 30, '正在生成设计规划...');
    console.log(`\n========== [WORKFLOW DEBUG] STARTING NODE 2 ==========`);
    console.log(`projectId: ${projectId}`);
    console.log(`====================================================\n`);
    
    try {
      const node2Result = await runNode2(projectId);
      
      console.log(`\n========== [WORKFLOW DEBUG] NODE 2 COMPLETE ==========`);
      console.log(`report length: ${node2Result.fullReport.length} chars`);
      console.log(`======================================================\n`);
      
      // 直接使用 fullReport 作为流式展示文本
      const planText = node2Result.fullReport;
      console.log(`[Workflow] Node 2 planText length: ${planText.length}`);
      
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

    //  节点3: 分屏 Prompt 生成（并行流式版） ──
    sse.sendProgress('node3', 55, '正在生成分屏提示词...');
    console.log(`\n========== [WORKFLOW DEBUG] STARTING NODE 3 ==========`);
    console.log(`projectId: ${projectId}`);
    console.log(`====================================================\n`);
    
    try {
      // 屏数直接来自项目表单字段
      const freshProject = await Project.findByPk(projectId);
      const totalScreenCount = freshProject?.screenCount || 8;
      // 日志节流：按 screenIndex 跟踪上次日志位置，每200字符打一条
      const lastLoggedChars: Record<number, number> = {};

      const node3Result = await runNode3(projectId, {
        // 每屏完成即实时推送 SSE（无需等待全部完成）
        onScreenComplete: (screenIndex, screenPrompt) => {
          if (!sse || sse.closed) return;
          sse.send({
            type: 'node3_screen',
            data: {
              screenIndex,
              screen: screenPrompt,
              total: totalScreenCount,
            },
            timestamp: Date.now(),
          });
          sse.sendProgress('node3', 55 + Math.floor(((screenIndex + 1) / totalScreenCount) * 20),
            `已生成第 ${screenIndex + 1}/${totalScreenCount} 屏提示词`);
        },
        onScreenProgress: (screenIndex, chars) => {
          // 节流日志：每200字符打一条，避免流式chunk刷屏
          const last = lastLoggedChars[screenIndex] ?? 0;
          if (chars - last >= 200) {
            console.log(`[Workflow] Node3 screen ${screenIndex} streaming: ${chars} chars`);
            lastLoggedChars[screenIndex] = chars;
          }
        },
      });
      
      console.log(`\n========== [WORKFLOW DEBUG] NODE 3 COMPLETE ==========`);
      console.log(`total screens:`, node3Result.screenPrompts?.length || 0);
      console.log(`======================================================\n`);
      
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

    // 获取所有屏信息
    const allScreens = await Screen.findAll({
      where: { projectId },
      order: [['screenIndex', 'ASC']],
    });

    //  节点4: 池化并发生图（最多5路并行，按完成顺序推送） ─
    const CONCURRENCY_LIMIT = 5;
    sse.sendProgress('node4', 80, '正在生成图片...');
    console.log(`\n========== [WORKFLOW DEBUG] STARTING NODE 4 ==========`);
    console.log(`projectId: ${projectId}`);
    console.log(`total screens:`, allScreens.length);
    console.log(`concurrency:`, CONCURRENCY_LIMIT);
    console.log(`====================================================\n`);

    // 串行化 SSE 写操作，防止并发 res.write 数据交错
    let sseWriteChain: Promise<void> = Promise.resolve();
    const safeSend = (data: any) => {
      sseWriteChain = sseWriteChain.then(() => {
        if (sse && !sse.closed) sse.send(data);
      });
    };

    let node4Completed = 0;
    const totalScreens = allScreens.length;
    const results: Array<{ index: number; status: 'fulfilled' | 'rejected' }> = [];

    // Worker pool：启动 min(并发上限, 屏数) 个 worker，每个 worker 循环取下一个任务
    let nextIndex = 0;
    const processNext = async () => {
      while (nextIndex < allScreens.length) {
        const i = nextIndex++;
        const screen = allScreens[i];
        console.log(`[Workflow] Launching image generation for screen ${i} of project ${projectId}`);
        try {
          const result = await runNode4(projectId, screen.screenIndex);
          console.log(`[Workflow] Screen ${i} image generated for project ${projectId}`);
          node4Completed++;
          results.push({ index: i, status: 'fulfilled' });
          safeSend({
            type: 'node4_screen',
            data: { screenIndex: i, imageUrl: result.imageUrl, total: totalScreens },
            timestamp: Date.now(),
          });
          safeSend({
            type: 'progress',
            data: {
              node: 'node4',
              percent: 80 + Math.floor((node4Completed / totalScreens) * 19),
              message: `已生成 ${node4Completed}/${totalScreens} 屏图片`,
            },
            timestamp: Date.now(),
          });
        } catch (err: any) {
          console.error(`[Workflow] Screen ${i} image generation failed for project ${projectId}:`, err);
          node4Completed++;
          results.push({ index: i, status: 'rejected' });
          safeSend({
            type: 'node4_screen_error',
            data: { screenIndex: i, error: err.message || `第${i + 1}屏生图失败` },
            timestamp: Date.now(),
          });
        }
      }
    };

    const workerCount = Math.min(CONCURRENCY_LIMIT, totalScreens);
    const workers: Promise<void>[] = [];
    for (let w = 0; w < workerCount; w++) {
      workers.push(processNext());
    }
    await Promise.all(workers);

    // 等待所有 SSE 写操作刷新完毕
    await sseWriteChain;

    const successCount = results.filter(r => r.status === 'fulfilled').length;
    console.log(`\n========== [WORKFLOW DEBUG] NODE 4 COMPLETE ==========`);
    console.log(`success: ${successCount}/${totalScreens}`);
    console.log(`====================================================\n`);

    sse.sendProgress('node4', 100, '工作流执行完成');

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
