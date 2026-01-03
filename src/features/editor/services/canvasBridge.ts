/**
 * Canvas Flow 跨标签页通信桥接服务
 * 用于接收来自 canvas-flow 的资源，并在导出完成后通知 canvas-flow
 */

import { dispatch } from "@designcombo/events";
import { ADD_VIDEO, ADD_IMAGE, ADD_AUDIO } from "@designcombo/state";
import { generateId } from "@designcombo/timeline";

// 通信频道名称（与 canvas-flow 保持一致）
const CHANNEL_NAME = 'canvas-video-bridge';

// 消息类型
export type BridgeMessageType = 
  | 'ADD_RESOURCE' 
  | 'REMOVE_RESOURCE' 
  | 'SYNC_RESOURCES' 
  | 'EXPORT_COMPLETE'
  | 'EDITOR_READY';

export interface BridgeMessage {
  type: BridgeMessageType;
  payload: any;
  timestamp: number;
}

export interface AddResourcePayload {
  id: string;
  url: string;
  type: 'video' | 'image' | 'audio';
  name: string;
  thumbnail?: string;
}

export interface ExportCompletePayload {
  id: string;
  url: string;
  thumbnail?: string;
  duration?: number;
}

class CanvasBridge {
  private channel: BroadcastChannel | null = null;
  private initialized = false;
  private nextStartTime = 0; // 下一个资源的开始时间

  constructor() {
    this.initChannel();
  }

  private initChannel(): void {
    if (typeof window === 'undefined') return;
    if (typeof BroadcastChannel === 'undefined') {
      console.warn('[CanvasBridge] BroadcastChannel 不支持');
      return;
    }

    this.channel = new BroadcastChannel(CHANNEL_NAME);
    this.channel.onmessage = this.handleMessage.bind(this);
    console.log('[CanvasBridge] 通信频道已建立');
  }

  private handleMessage(event: MessageEvent<BridgeMessage>): void {
    const { type, payload } = event.data;
    console.log('[CanvasBridge] 收到消息:', type, payload);

    switch (type) {
      case 'ADD_RESOURCE':
        this.handleAddResource(payload as AddResourcePayload);
        break;

      case 'REMOVE_RESOURCE':
        // 暂不处理移除（轨道上的资源不自动移除）
        console.log('[CanvasBridge] 收到移除资源请求:', payload);
        break;

      case 'SYNC_RESOURCES':
        this.handleSyncResources(payload.resources as AddResourcePayload[]);
        break;

      default:
        console.log('[CanvasBridge] 未处理的消息类型:', type);
    }
  }

  private handleAddResource(payload: AddResourcePayload): void {
    const { url, type, name, thumbnail } = payload;
    
    console.log('[CanvasBridge] 添加资源到轨道:', { url, type, name, startTime: this.nextStartTime });

    // 默认时长（毫秒）
    const DEFAULT_IMAGE_DURATION = 5000;
    const DEFAULT_AUDIO_DURATION = 10000;

    switch (type) {
      case 'video':
        dispatch(ADD_VIDEO, {
          payload: {
            id: generateId(),
            details: { src: url },
            metadata: { 
              previewUrl: thumbnail || url,
              name 
            }
          },
          options: {
            resourceId: "main",
            scaleMode: "fit"
          }
        });
        // 视频默认假设 10 秒，避免后续资源重叠
        this.nextStartTime += 10000;
        break;

      case 'image':
        dispatch(ADD_IMAGE, {
          payload: {
            id: generateId(),
            type: "image",
            display: { 
              from: this.nextStartTime, 
              to: this.nextStartTime + DEFAULT_IMAGE_DURATION 
            },
            details: { src: url },
            metadata: { name }
          },
          options: {}
        });
        this.nextStartTime += DEFAULT_IMAGE_DURATION;
        break;

      case 'audio':
        dispatch(ADD_AUDIO, {
          payload: {
            id: generateId(),
            type: "audio",
            display: {
              from: this.nextStartTime,
              to: this.nextStartTime + DEFAULT_AUDIO_DURATION
            },
            details: { src: url },
            metadata: { name }
          },
          options: {}
        });
        this.nextStartTime += DEFAULT_AUDIO_DURATION;
        break;
    }
  }

  private handleSyncResources(resources: AddResourcePayload[]): void {
    console.log('[CanvasBridge] 同步资源:', resources.length, '个');
    // 重置时间位置
    this.nextStartTime = 0;
    // 逐个添加资源，每个资源间隔 500ms 避免冲突
    resources.forEach((resource, index) => {
      setTimeout(() => {
        this.handleAddResource(resource);
      }, index * 500);
    });
  }

  // ============ 公共方法 ============

  /**
   * 初始化（在编辑器就绪后调用）
   */
  init(): void {
    if (this.initialized) return;
    this.initialized = true;
    
    // 延迟 1.5 秒后通知 canvas-flow，确保编辑器完全就绪
    setTimeout(() => {
      this.postMessage('EDITOR_READY', {});
      console.log('[CanvasBridge] 编辑器已就绪，已通知 canvas-flow');
    }, 1500);
  }

  /**
   * 通知导出完成
   */
  notifyExportComplete(payload: ExportCompletePayload): void {
    this.postMessage('EXPORT_COMPLETE', payload);
    console.log('[CanvasBridge] 已通知导出完成:', payload.url);
  }

  private postMessage(type: BridgeMessageType, payload: any): void {
    if (!this.channel) {
      console.warn('[CanvasBridge] 通信频道未建立');
      return;
    }

    const message: BridgeMessage = {
      type,
      payload,
      timestamp: Date.now(),
    };

    this.channel.postMessage(message);
  }

  /**
   * 销毁通信频道
   */
  destroy(): void {
    if (this.channel) {
      this.channel.close();
      this.channel = null;
    }
    this.initialized = false;
  }
}

// 单例导出
export const canvasBridge = new CanvasBridge();

