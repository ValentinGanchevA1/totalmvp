// src/modules/events/events.gateway.ts
import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  ConnectedSocket,
  MessageBody,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { JwtService } from '@nestjs/jwt';

interface EventRoomData {
  eventId: string;
  userId: string;
}

@WebSocketGateway({
  cors: { origin: '*' },
  namespace: '/events',
})
export class EventsGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private userSockets = new Map<string, string>(); // userId -> socketId
  private socketUsers = new Map<string, string>(); // socketId -> userId
  private eventRooms = new Map<string, Set<string>>(); // eventId -> Set of userIds

  constructor(private readonly jwtService: JwtService) {}

  async handleConnection(client: Socket) {
    try {
      const token = client.handshake.auth.token;
      if (!token) {
        client.disconnect();
        return;
      }

      const payload = this.jwtService.verify(token);
      const userId = payload.sub;

      this.userSockets.set(userId, client.id);
      this.socketUsers.set(client.id, userId);

      // Join user's personal room for notifications
      client.join(`user:${userId}`);

      console.log(`Events: User ${userId} connected`);
    } catch (error) {
      client.disconnect();
    }
  }

  handleDisconnect(client: Socket) {
    const userId = this.socketUsers.get(client.id);
    if (userId) {
      this.userSockets.delete(userId);
      this.socketUsers.delete(client.id);

      // Remove from all event rooms
      this.eventRooms.forEach((users, eventId) => {
        if (users.has(userId)) {
          users.delete(userId);
          this.server.to(`event:${eventId}`).emit('event:user:left', { userId, eventId });
        }
      });

      console.log(`Events: User ${userId} disconnected`);
    }
  }

  @SubscribeMessage('event:join')
  handleJoinEvent(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { eventId: string },
  ) {
    const userId = this.socketUsers.get(client.id);
    if (!userId) return;

    const { eventId } = data;
    client.join(`event:${eventId}`);

    if (!this.eventRooms.has(eventId)) {
      this.eventRooms.set(eventId, new Set());
    }
    this.eventRooms.get(eventId)!.add(userId);

    // Notify others in the event
    client.to(`event:${eventId}`).emit('event:user:joined', { userId, eventId });

    // Send current users in event
    const roomUsers = this.eventRooms.get(eventId);
    const users = roomUsers ? Array.from(roomUsers) : [];
    client.emit('event:users', { eventId, users });
  }

  @SubscribeMessage('event:leave')
  handleLeaveEvent(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { eventId: string },
  ) {
    const userId = this.socketUsers.get(client.id);
    if (!userId) return;

    const { eventId } = data;
    client.leave(`event:${eventId}`);

    const users = this.eventRooms.get(eventId);
    if (users) {
      users.delete(userId);
    }

    client.to(`event:${eventId}`).emit('event:user:left', { userId, eventId });
  }

  // ==================== BROADCAST METHODS ====================

  broadcastEventCreated(event: any, nearbyUserIds: string[]) {
    nearbyUserIds.forEach((userId) => {
      this.server.to(`user:${userId}`).emit('event:created', event);
    });
  }

  broadcastEventUpdated(eventId: string, updates: any) {
    this.server.to(`event:${eventId}`).emit('event:updated', {
      eventId,
      ...updates,
    });
  }

  broadcastEventCancelled(eventId: string) {
    this.server.to(`event:${eventId}`).emit('event:cancelled', { eventId });
  }

  broadcastAttendeeUpdate(eventId: string, attendee: any, action: 'joined' | 'left' | 'updated') {
    this.server.to(`event:${eventId}`).emit('event:attendee', {
      eventId,
      attendee,
      action,
    });
  }

  broadcastCheckIn(eventId: string, userId: string, displayName: string) {
    this.server.to(`event:${eventId}`).emit('event:checkin', {
      eventId,
      userId,
      displayName,
    });
  }

  // Poll broadcasts
  broadcastPollCreated(eventId: string, poll: any) {
    this.server.to(`event:${eventId}`).emit('poll:created', {
      eventId,
      poll,
    });
  }

  broadcastPollVote(eventId: string, pollId: string, voteCounts: Record<string, number>, totalVotes: number) {
    this.server.to(`event:${eventId}`).emit('poll:vote', {
      eventId,
      pollId,
      voteCounts,
      totalVotes,
    });
  }

  broadcastPollClosed(eventId: string, pollId: string) {
    this.server.to(`event:${eventId}`).emit('poll:closed', {
      eventId,
      pollId,
    });
  }

  // Q&A broadcasts
  broadcastQuestionCreated(eventId: string, question: any) {
    this.server.to(`event:${eventId}`).emit('question:new', {
      eventId,
      question,
    });
  }

  broadcastQuestionUpvote(eventId: string, questionId: string, upvotes: number) {
    this.server.to(`event:${eventId}`).emit('question:upvote', {
      eventId,
      questionId,
      upvotes,
    });
  }

  broadcastQuestionAnswered(eventId: string, questionId: string) {
    this.server.to(`event:${eventId}`).emit('question:answered', {
      eventId,
      questionId,
    });
  }

  broadcastQuestionPinned(eventId: string, questionId: string, isPinned: boolean) {
    this.server.to(`event:${eventId}`).emit('question:pinned', {
      eventId,
      questionId,
      isPinned,
    });
  }

  // Get online users count for event
  getOnlineUsersInEvent(eventId: string): number {
    return this.eventRooms.get(eventId)?.size || 0;
  }
}
