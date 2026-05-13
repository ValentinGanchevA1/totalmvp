// src/utils/offlineQueue.ts
import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo from '@react-native-community/netinfo';
import { apiClient } from '../api/client';

interface QueuedRequest {
  id: string;
  url: string;
  method: 'POST' | 'PUT' | 'DELETE';
  data?: any;
  timestamp: number;
  retryCount: number;
}

const QUEUE_KEY = 'offline_queue';
const MAX_QUEUE_SIZE = 100;
const MAX_RETRIES = 3;

class OfflineQueue {
  private isOnline = true;
  private isProcessing = false;

  constructor() {
    // Listen to network changes
    NetInfo.addEventListener(state => {
      const wasOffline = !this.isOnline;
      this.isOnline = state.isConnected ?? false;

      // If we just came back online, process the queue
      if (wasOffline && this.isOnline) {
        this.processQueue();
      }
    });

    // Initial network check
    NetInfo.fetch().then(state => {
      this.isOnline = state.isConnected ?? false;
    });
  }

  async addToQueue(url: string, method: 'POST' | 'PUT' | 'DELETE', data?: any): Promise<void> {
    if (this.isOnline) {
      // If online, execute immediately
      try {
        await apiClient.request({ url, method, data });
      } catch (_error) {
        // If it fails, add to queue for retry
        await this.storeRequest(url, method, data);
      }
    } else {
      // If offline, store for later
      await this.storeRequest(url, method, data);
    }
  }

  private async storeRequest(url: string, method: 'POST' | 'PUT' | 'DELETE', data?: any): Promise<void> {
    const queue = await this.getQueue();
    const request: QueuedRequest = {
      id: `${Date.now()}-${Math.random()}`,
      url,
      method,
      data,
      timestamp: Date.now(),
      retryCount: 0,
    };

    queue.push(request);

    // Keep queue size manageable
    if (queue.length > MAX_QUEUE_SIZE) {
      queue.shift(); // Remove oldest
    }

    await AsyncStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
  }

  private async getQueue(): Promise<QueuedRequest[]> {
    const stored = await AsyncStorage.getItem(QUEUE_KEY);
    return stored ? JSON.parse(stored) : [];
  }

  private async processQueue(): Promise<void> {
    if (this.isProcessing || !this.isOnline) return;

    this.isProcessing = true;

    try {
      const queue = await this.getQueue();
      const remainingRequests: QueuedRequest[] = [];

      for (const request of queue) {
        try {
          await apiClient.request({
            url: request.url,
            method: request.method,
            data: request.data,
          });
          // Success - don't add back to queue
        } catch (_error) {
          request.retryCount++;
          if (request.retryCount < MAX_RETRIES) {
            remainingRequests.push(request);
          }
          // Give up after max retries
        }
      }

      await AsyncStorage.setItem(QUEUE_KEY, JSON.stringify(remainingRequests));
    } finally {
      this.isProcessing = false;
    }
  }
}

export const offlineQueue = new OfflineQueue();
